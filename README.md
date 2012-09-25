# Portra

Portra is a proof-of-concept that implements iOS6's media upload capability, HMTL5 canvas and Twitter OAuth to build a quick little photo sharing web app. It's being hosted on Heroku so you can [try it out](https://portra.herokuapp.com).

It was built in the course of a weekend by [Brandon Evans](http://www.brandonevans.ca) to play around and learn new things.

It's really only designed to run on iPod touches or iPhones with iOS 6 (obviously). Anything else will get redirected to an about page. There's probably some bugs, I'm okay with that.

I'm patiently waiting for a cease and desist from Kodak.

## Take-Aways

- Canvas on mobile devices is really slow, always test directly on them.
- Image orientation for photos directly from the camera is stored in metadata (mimicking the behaviour in Cocoa) so you need to handle this. I've done this, so take the code and run.
- Weekend projects are fun.