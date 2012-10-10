require 'bundler/setup'
Bundler.require()
require 'sinatra/base'
require 'net/http/post/multipart'

SITE_TITLE = 'Portra'

class App < Sinatra::Base

  # Configuration ##############################################################

  register Sinatra::Flash
  set :public_folder, 'public'

  configure :production do
    DataMapper.setup(:default, ENV['DATABASE_URL'])
    use Rack::Session::Cookie, :expire_after => 2592000
    set :session_secret, ENV['SESSION_KEY']
  end

  configure :development do
    yaml = YAML.load_file("config.yaml")
    yaml.each_pair do |key, value|
      set(key.to_sym, value)
    end

    DataMapper.setup(:default, "postgres://#{ settings.db_user }:#{ settings.db_password }@#{ settings.db_host }/#{ settings.db_name }")
    use Rack::Session::Cookie, :expire_after => 2592000
    set :session_secret, settings.session_secret
  end

  configure :test do
    yaml = YAML.load_file("config.yaml")
    yaml.each_pair do |key, value|
      set(key.to_sym, value)
    end

    DataMapper.setup(:default, "sqlite::memory:")
    use Rack::Session::Cookie
    set :session_secret, settings.session_secret
  end

  client = Twilio::REST::Client.new(ENV['TWILIO_SID'] || settings.twilio_sid, ENV['TWILIO_TOKEN'] || settings.twilio_token)

  if ENV['RACK_ENV'] == 'production'
    key = ENV['TWITTER_KEY'] || settings.twitter_key
    secret = ENV['TWITTER_SECRET'] || settings.twitter_secret
  else
    key = settings.twitter_testing_key
    secret = settings.twitter_testing_secret
  end
  use OmniAuth::Builder do
    provider :twitter, key, secret
  end

  if memcache_servers = ENV["MEMCACHE_SERVERS"]
    use Rack::Cache,
      :verbose => true,
      :metastore => Dalli::Client.new,
      :entitystore => 'file:tmp/cache/rack/body'
    set :static_cache_control, [:public, {:max_age => 60*60*24*7}]
  end
  use Rack::Deflater

  # Models #####################################################################

  class User
    include DataMapper::Resource

    property :id, Serial
    property :name, String, :required => true
    property :provider, String
    property :uid, String, :required => true, :unique => true
    property :token, String
    property :secret, String

    timestamps :at
  end

  DataMapper.finalize.auto_upgrade!

  # Helpers ####################################################################

  def current_user
    user = User.get session[:id]
    return user unless user.nil?
  end

  def login_required
    if current_user != nil
      return true
    else
      redirect '/'
      return false
    end
  end

  def ios6_iphone_browser?
    return /(iPhone.OS.6)/.match(request.env["HTTP_USER_AGENT"])
  end

  def prepare_access_token(oauth_token, oauth_token_secret)
    if ENV['RACK_ENV'] == 'production'
      consumer_key = ENV['TWITTER_KEY'] || settings.twitter_key
      consumer_secret = ENV['TWITTER_SECRET'] || settings.twitter_secret
    else
      consumer_key = settings.twitter_testing_key
      consumer_secret = settings.twitter_testing_secret
    end

    consumer = OAuth::Consumer.new(consumer_key, consumer_secret,
      { :site => "https://api.twitter.com",
        :scheme => :header
      })
    # now create the access token object from passed values
    token_hash = { :oauth_token => oauth_token, :oauth_token_secret => oauth_token_secret }
    access_token = OAuth::AccessToken.from_hash(consumer, token_hash)
    return access_token
  end

  def versioned_stylesheet(stylesheet)
    "/css/#{stylesheet}.css?" + File.mtime(File.join("public/css", "#{stylesheet}.css")).to_i.to_s
  end

  def versioned_javascript(js)
    "/js/#{js}.js?" + File.mtime(File.join("public/js", "#{js}.js")).to_i.to_s
  end

  # Routes #####################################################################

  before do
    # redirect non-'iPhone with iOS 6' browsers
    unless ios6_iphone_browser? or request.path_info == '/about' || request.path_info == '/sms'
      redirect '/about'
    end
  end

  get '/' do
    if current_user != nil
      redirect '/camera'
    end
    erb :index
  end

  %w(get post).each do |method|
    send(method, '/auth/:provider/callback/?') do
      auth_hash = env['omniauth.auth']
      user = User.first_or_create({:uid => auth_hash['uid']},
                                  {:name => auth_hash['info']['name'],
                                   :provider => auth_hash['provider'],
                                   :token => auth_hash['credentials']['token'],
                                   :secret => auth_hash['credentials']['secret']})
      session[:id] = user.id
      redirect '/camera'
    end
  end

  get '/auth/failure/?' do
    flash[:error] = "There was an error logging in."
    redirect '/'
  end

  get '/auth/:provider/deauthorized/?' do
    flash[:notice] = "#{params[:provider]} has deauthorized Portra."
    redirect "/"
  end

  get '/logout/?' do
    session[:id] = nil
    redirect "/"
  end

  get '/camera' do
    login_required

    erb :camera
  end

  post '/tweet' do
    login_required

    access_token = prepare_access_token(current_user.token, current_user.secret)
    Tempfile.open(['photo', '.png']) do |temporaryFile|
      data = params[:photo].split(',')[1]
      temporaryFile.write(Base64.decode64(data))
      temporaryFile.rewind
      puts response = access_token.multipart_post('https://api.twitter.com/1.1/statuses/update_with_media.json',
                                                  :status => params[:status],
                                                  'media[]' => UploadIO.new(temporaryFile, 'image/png', temporaryFile.path),
                                                  :lat => params[:lat],
                                                  :long => params[:long])
    end
  end

  post '/sms' do
    account = client.account
    message = account.sms.messages.create :from => '+17806664693', :to => params[:number], :body => 'Try Portra: http://bit.ly/WP5tqY'

    flash[:notice] = "Message sent"
    redirect '/about'
  end

  get '/twitter_config' do
    login_required
    access_token = prepare_access_token(current_user.token, current_user.secret)
    access_token.get('https://api.twitter.com/1.1/help/configuration.json').body
  end

  get '/about' do
    erb :about
  end

end
