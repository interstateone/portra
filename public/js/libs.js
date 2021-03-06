
/*
 * Binary Ajax 0.1.10
 * Copyright (c) 2008 Jacob Seidelin, cupboy@gmail.com, http://blog.nihilogic.dk/
 * Licensed under the MPL License [http://www.nihilogic.dk/licenses/mpl-license.txt]
 */


var BinaryFile = function(strData, iDataOffset, iDataLength) {
	var data = strData;
	var dataOffset = iDataOffset || 0;
	var dataLength = 0;

	this.getRawData = function() {
		return data;
	}

	if (typeof strData == "string") {
		dataLength = iDataLength || data.length;

		this.getByteAt = function(iOffset) {
			return data.charCodeAt(iOffset + dataOffset) & 0xFF;
		}
		
		this.getBytesAt = function(iOffset, iLength) {
			var aBytes = [];
			
			for (var i = 0; i < iLength; i++) {
				aBytes[i] = data.charCodeAt((iOffset + i) + dataOffset) & 0xFF
			};
			
			return aBytes;
		}
	} else if (typeof strData == "unknown") {
		dataLength = iDataLength || IEBinary_getLength(data);

		this.getByteAt = function(iOffset) {
			return IEBinary_getByteAt(data, iOffset + dataOffset);
		}

		this.getBytesAt = function(iOffset, iLength) {
			return new VBArray(IEBinary_getBytesAt(data, iOffset + dataOffset, iLength)).toArray();
		}
	}

	this.getLength = function() {
		return dataLength;
	}

	this.getSByteAt = function(iOffset) {
		var iByte = this.getByteAt(iOffset);
		if (iByte > 127)
			return iByte - 256;
		else
			return iByte;
	}

	this.getShortAt = function(iOffset, bBigEndian) {
		var iShort = bBigEndian ? 
			(this.getByteAt(iOffset) << 8) + this.getByteAt(iOffset + 1)
			: (this.getByteAt(iOffset + 1) << 8) + this.getByteAt(iOffset)
		if (iShort < 0) iShort += 65536;
		return iShort;
	}
	this.getSShortAt = function(iOffset, bBigEndian) {
		var iUShort = this.getShortAt(iOffset, bBigEndian);
		if (iUShort > 32767)
			return iUShort - 65536;
		else
			return iUShort;
	}
	this.getLongAt = function(iOffset, bBigEndian) {
		var iByte1 = this.getByteAt(iOffset),
			iByte2 = this.getByteAt(iOffset + 1),
			iByte3 = this.getByteAt(iOffset + 2),
			iByte4 = this.getByteAt(iOffset + 3);

		var iLong = bBigEndian ? 
			(((((iByte1 << 8) + iByte2) << 8) + iByte3) << 8) + iByte4
			: (((((iByte4 << 8) + iByte3) << 8) + iByte2) << 8) + iByte1;
		if (iLong < 0) iLong += 4294967296;
		return iLong;
	}
	this.getSLongAt = function(iOffset, bBigEndian) {
		var iULong = this.getLongAt(iOffset, bBigEndian);
		if (iULong > 2147483647)
			return iULong - 4294967296;
		else
			return iULong;
	}

	this.getStringAt = function(iOffset, iLength) {
		var aStr = [];
		
		var aBytes = this.getBytesAt(iOffset, iLength);
		for (var j=0; j < iLength; j++) {
			aStr[j] = String.fromCharCode(aBytes[j]);
		}
		return aStr.join("");
	}
	
	this.getCharAt = function(iOffset) {
		return String.fromCharCode(this.getByteAt(iOffset));
	}
	this.toBase64 = function() {
		return window.btoa(data);
	}
	this.fromBase64 = function(strBase64) {
		data = window.atob(strBase64);
	}
}


var BinaryAjax = (function() {

	function createRequest() {
		var oHTTP = null;
		if (window.ActiveXObject) {
			oHTTP = new ActiveXObject("Microsoft.XMLHTTP");
		} else if (window.XMLHttpRequest) {
			oHTTP = new XMLHttpRequest();
		}
		return oHTTP;
	}

	function getHead(strURL, fncCallback, fncError) {
		var oHTTP = createRequest();
		if (oHTTP) {
			if (fncCallback) {
				if (typeof(oHTTP.onload) != "undefined") {
					oHTTP.onload = function() {
						if (oHTTP.status == "200") {
							fncCallback(this);
						} else {
							if (fncError) fncError();
						}
						oHTTP = null;
					};
				} else {
					oHTTP.onreadystatechange = function() {
						if (oHTTP.readyState == 4) {
							if (oHTTP.status == "200") {
								fncCallback(this);
							} else {
								if (fncError) fncError();
							}
							oHTTP = null;
						}
					};
				}
			}
			oHTTP.open("HEAD", strURL, true);
			oHTTP.send(null);
		} else {
			if (fncError) fncError();
		}
	}

	function sendRequest(strURL, fncCallback, fncError, aRange, bAcceptRanges, iFileSize) {
		var oHTTP = createRequest();
		if (oHTTP) {

			var iDataOffset = 0;
			if (aRange && !bAcceptRanges) {
				iDataOffset = aRange[0];
			}
			var iDataLen = 0;
			if (aRange) {
				iDataLen = aRange[1]-aRange[0]+1;
			}

			if (fncCallback) {
				if (typeof(oHTTP.onload) != "undefined") {
					oHTTP.onload = function() {
						if (oHTTP.status == "200" || oHTTP.status == "206" || oHTTP.status == "0") {
							oHTTP.binaryResponse = new BinaryFile(oHTTP.responseText, iDataOffset, iDataLen);
							oHTTP.fileSize = iFileSize || oHTTP.getResponseHeader("Content-Length");
							fncCallback(oHTTP);
						} else {
							if (fncError) fncError();
						}
						oHTTP = null;
					};
				} else {
					oHTTP.onreadystatechange = function() {
						if (oHTTP.readyState == 4) {
							if (oHTTP.status == "200" || oHTTP.status == "206" || oHTTP.status == "0") {
								// IE6 craps if we try to extend the XHR object
								var oRes = {
									status : oHTTP.status,
									// IE needs responseBody, Chrome/Safari needs responseText
									binaryResponse : new BinaryFile(
										typeof oHTTP.responseBody == "unknown" ? oHTTP.responseBody : oHTTP.responseText, iDataOffset, iDataLen
									),
									fileSize : iFileSize || oHTTP.getResponseHeader("Content-Length")
								};
								fncCallback(oRes);
							} else {
								if (fncError) fncError();
							}
							oHTTP = null;
						}
					};
				}
			}
			oHTTP.open("GET", strURL, true);

			if (oHTTP.overrideMimeType) oHTTP.overrideMimeType('text/plain; charset=x-user-defined');

			if (aRange && bAcceptRanges) {
				oHTTP.setRequestHeader("Range", "bytes=" + aRange[0] + "-" + aRange[1]);
			}

			oHTTP.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 1970 00:00:00 GMT");

			oHTTP.send(null);
		} else {
			if (fncError) fncError();
		}
	}

	return function(strURL, fncCallback, fncError, aRange) {

		if (aRange) {
			getHead(
				strURL, 
				function(oHTTP) {
					var iLength = parseInt(oHTTP.getResponseHeader("Content-Length"),10);
					var strAcceptRanges = oHTTP.getResponseHeader("Accept-Ranges");

					var iStart, iEnd;
					iStart = aRange[0];
					if (aRange[0] < 0) 
						iStart += iLength;
					iEnd = iStart + aRange[1] - 1;

					sendRequest(strURL, fncCallback, fncError, [iStart, iEnd], (strAcceptRanges == "bytes"), iLength);
				}
			);

		} else {
			sendRequest(strURL, fncCallback, fncError);
		}
	}

}());

/*
document.write(
	"<script type='text/vbscript'>\r\n"
	+ "Function IEBinary_getByteAt(strBinary, iOffset)\r\n"
	+ "	IEBinary_getByteAt = AscB(MidB(strBinary,iOffset+1,1))\r\n"
	+ "End Function\r\n"
	+ "Function IEBinary_getLength(strBinary)\r\n"
	+ "	IEBinary_getLength = LenB(strBinary)\r\n"
	+ "End Function\r\n"
	+ "</script>\r\n"
);
*/

document.write(
	"<script type='text/vbscript'>\r\n"
	+ "Function IEBinary_getByteAt(strBinary, iOffset)\r\n"
	+ "	IEBinary_getByteAt = AscB(MidB(strBinary, iOffset + 1, 1))\r\n"
	+ "End Function\r\n"
	+ "Function IEBinary_getBytesAt(strBinary, iOffset, iLength)\r\n"
	+ "  Dim aBytes()\r\n"
	+ "  ReDim aBytes(iLength - 1)\r\n"
	+ "  For i = 0 To iLength - 1\r\n"
	+ "   aBytes(i) = IEBinary_getByteAt(strBinary, iOffset + i)\r\n"  
	+ "  Next\r\n"
	+ "  IEBinary_getBytesAt = aBytes\r\n" 
	+ "End Function\r\n"
	+ "Function IEBinary_getLength(strBinary)\r\n"
	+ "	IEBinary_getLength = LenB(strBinary)\r\n"
	+ "End Function\r\n"
	+ "</script>\r\n"
);
/* ==========================================================
 * bootstrap-alert.js v2.1.1
 * http://twitter.github.com/bootstrap/javascript.html#alerts
 * ==========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

  "use strict"; // jshint ;_;


 /* ALERT CLASS DEFINITION
  * ====================== */

  var dismiss = '[data-dismiss="alert"]'
    , Alert = function (el) {
        $(el).on('click', dismiss, this.close)
      }

  Alert.prototype.close = function (e) {
    var $this = $(this)
      , selector = $this.attr('data-target')
      , $parent

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
    }

    $parent = $(selector)

    e && e.preventDefault()

    $parent.length || ($parent = $this.hasClass('alert') ? $this : $this.parent())

    $parent.trigger(e = $.Event('close'))

    if (e.isDefaultPrevented()) return

    $parent.removeClass('in')

    function removeElement() {
      $parent
        .trigger('closed')
        .remove()
    }

    $.support.transition && $parent.hasClass('fade') ?
      $parent.on($.support.transition.end, removeElement) :
      removeElement()
  }


 /* ALERT PLUGIN DEFINITION
  * ======================= */

  $.fn.alert = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('alert')
      if (!data) $this.data('alert', (data = new Alert(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  $.fn.alert.Constructor = Alert


 /* ALERT DATA-API
  * ============== */

  $(function () {
    $('body').on('click.alert.data-api', dismiss, Alert.prototype.close)
  })

}(window.jQuery);
eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('(u(){I $,4m,1X,2I,P,1o,2S,1R,2J,G,1Y,4F,2P,2O,4R,2Z,2b,1W,7z,1Z,1u,4W,4Z,86,82={}.dN,9j=[].dP||u(9W){1d(I i=0,l=m.1m;i<l;i++){B(i 7X m&&m[i]===9W)o i}o-1};4Z=7Z.1b.4Z;$=u(7r,7u){B(7u==N){7u=2o}B(1A 7r==="3p"){o 7r}o 7u.dO(7r)};1u=(u(){1u.1a=\'1u\';u 1u(){}1u.5k=(u(){I X;X=0;o{3C:u(){o X++}}})();1u.5d=u(7x){I 64,7t,5H,1V,H,2L;7t=7x;1V=4Z.2K(1l,1);1d(H=0,2L=1V.1m;H<2L;H++){64=1V[H];1d(5H 7X 64){B(!82.2K(64,5H))7o;7t[5H]=64[5H]}}o 7t};1u.3s=u(2C){B(2C<0){o 0}B(2C>C){o C}o 2C};o 1u})();B(1A 2x!=="4s"&&2x!==N){7z=2x;2S=9R(\'K\');4F=2S.4F;4W=9R(\'4W\')}R{7z=dM}7z.P=P=u(){B(1A 2x!=="4s"&&2x!==N){o 1U 1o(1l,1o.1Q.7A)}4G(1l.1m){1M 1:B(1Z.76(1l[0])){o 1Z.3C(1l[0])}o 1U 1o(1l,1o.1Q.4F);1M 2:B(1Z.76(1l[0])){o 1Z.3V(1l[0],1l[1])}B(1A 1l[1]===\'u\'){o 1U 1o(1l,1o.1Q.8i)}R{o 1U 1o(1l,1o.1Q.2S)}2U;1M 3:B(1Z.76(1l[0])){o 1Z.3V(1l[1],1l[2])}o 1U 1o(1l,1o.1Q.2S)}};P.8k={9v:"3.1.2",9Q:"4/6/12"};P.9a=3G;P.8r=u(){o"dH "+P.8k.9v+", dF "+P.8k.9Q};P.6I="";P.1u=1u;1o=(u(){1o.1a=\'1o\';1o.1Q={4F:1,2S:2,8i:3,7A:4};1o.8r=P.8r;u 1o(2q,1j){I 1y=m;B(1j==N){1j=1o.1Q.2S}m.X=1u.5k.3C();m.5N=[];m.8t=[];m.3Q=[];m.8x=[];m.5W=N;m.dD=1U 4m(m);4G(1j){1M 1o.1Q.4F:m.8C.3Y(m,2q);2U;1M 1o.1Q.2S:m.6m.3Y(m,2q);2U;1M 1o.1Q.7A:m.9l.3Y(m,2q);2U;1M 1o.1Q.8i:B($(2q[0])){m.8H(2q)}R{B(2o.8G==="63"){5y"8A 8y 8w 2y 8v X "+X;}2o.8s("8n",u(){o 1y.8H(2q)},3G)}}}1o.1b.8H=u(2q){I e;e=$(2q[0]);4G(e.6f.4q()){1M"1T":o m.8C.3Y(m,2q);1M"K":o m.6m(N,2q[0],2q[1])}};1o.1b.8C=u(X,1r){I 2y,S,4c,T,1y=m;B(1r==N){1r=u(){}}B(1A X==="3p"&&((T=X.6f)!=N?T.4q():6X 0)==="1T"){2y=X;B(X.X){X=2y.X}R{X="9K-"+(1u.5k.3C());2y.X=X}B(2y.63){o m.5a(X,2y,1r)}}B($(X)!=N){S=$(X);4c=1Y.6Y(S.1V);B(4c){S.5S=u(){o 1y.5a(X,S,1r)};o S.1V=4c}R{B(S.63){o m.5a(X,S,1r)}R{o S.5S=u(){o 1y.5a(X,S,1r)}}}}R{B(2o.8G==="63"){5y"8A 8y 8w 2y 8v X "+X;}o 2o.8s("8n",u(){o 1y.5a(X,$(X),1r)},3G)}};1o.1b.5a=u(X,S,1r){I 5R,H,2L,T;m.S=S;B(!S||S.6f.4q()!=="1T"){5y"ae 2y ay aR\'t an S: "+X;}m.K=2o.41(\'K\');m.K.X=S.X;T=[\'2j-9y\',\'2j-9z\'];1d(H=0,2L=T.1m;H<2L;H++){5R=T[H];B(m.S.72(5R)){m.K.dr(5R,m.S.72(5R))}}B(S.77!=N){S.77.9M(m.K,m.S)}m.7a=X;m.1v={K:X,S:m.S.1V};o m.6e(1r)};1o.1b.6m=u(3c,X,1r){I 2y,T,1y=m;B(1r==N){1r=u(){}}B(1A X==="3p"&&((T=X.6f)!=N?T.4q():6X 0)==="K"){2y=X;B(X.X){X=2y.X}R{X="9K-"+(1u.5k.3C());2y.X=X}o m.7b(3c,2y,1r)}R{B(X.ap(0)!=="#"){X="#"+X}}B($(X)!=N){o m.7b(3c,$(X),1r)}R{B(2o.8G==="63"){5y"8A 8y 8w 2y 8v X "+X;}o 2o.8s("8n",u(){o 1y.7b(3c,$(X),1r)},3G)}};1o.1b.7b=u(3c,K,1r){I 4c,1y=m;m.K=K;B(!K||K.6f.4q()!=="K"){5y"ae 2y ay aR\'t a K: "+X;}B(3c!=N){m.S=2o.41(\'1T\');m.S.5S=u(){o 1y.6e(1r)};4c=1Y.6Y(3c);m.7a=m.K.X;m.1v={K:K.X,S:3c};o m.S.1V=4c?4c:3c}R{o m.6e(1r)}};1o.1b.9l=u(3y,1r){I 1T,1y=m;1T=1U 4F();3y=4W.dq(3y);1T.5S=u(){I 1C;1y.7a=1u.5k.3C();1y.K=1U 2S(1T.E,1T.F);1C=1y.K.4w(\'2d\');1C.5Y(1T,0,0);o 1y.6e(1r)};1T.do=u(9I){5y 9I;};o 1T.1V=3y};1o.1b.6e=u(1r){I 4O,5M,7j,7m;m.1C=m.K.4w("2d");B(m.S!=N){7m=m.S.E;7j=m.S.F;5M=m.K.72(\'2j-9y\');4O=m.K.72(\'2j-9z\');B(5M||4O){B(5M){m.S.E=3q(5M,10);B(4O){m.S.F=3q(4O,10)}R{m.S.F=m.S.E*7j/7m}}R B(4O){m.S.F=3q(4O,10);m.S.E=m.S.F*7m/7j}}m.K.E=m.S.E;m.K.F=m.S.F;m.1C.5Y(m.S,0,0,m.S.E,m.S.F)}m.43=m.1C.53(0,0,m.K.E,m.K.F);m.Z=m.43.2j;m.1c={E:m.K.E,F:m.K.F};1Z.aL(m.7a,m);1r.2K(m,m);o m};1o.1b.81=u(8Z){I 5K;5K=m.K;m.K=8Z;B(5K.77!=N){5K.77.9M(m.K,5K)}m.1C=m.K.4w(\'2d\');m.43=m.1C.53(0,0,m.K.E,m.K.F);m.Z=m.43.2j;o m.1c={E:m.K.E,F:m.K.F}};o 1o})();4m=(u(){4m.1a=\'4m\';u 4m(c){m.c=c}4m.1b.dn=u(){I i,3n,6i,H,1p,1q,T;3n={r:{},g:{},b:{}};1d(i=H=0;H<=C;i=++H){3n.r[i]=0;3n.g[i]=0;3n.b[i]=0}1d(i=1p=0,T=m.c.Z.1m;1p<T;i=1p+=4){3n.r[m.c.Z[i]]++;3n.g[m.c.Z[i+1]]++;3n.b[m.c.Z[i+2]]++}6i=m.c.Z.1m/4;1d(i=1q=0;1q<=C;i=++1q){3n.r[i]/=6i;3n.g[i]/=6i;3n.b[i]/=6i}o 3n};o 4m})();1X=(u(){1X.1a=\'1X\';u 1X(){}1X.7E={};1X.M=u(1a,9P){o m.7E[1a]=9P};1X.3V=u(1a,V,O){o m.7E[1a](V,O)};o 1X})();P.1X=1X;2I=(u(){2I.1a=\'2I\';u 2I(){}2I.4I=u(3O,3U,4h,4g){o L.7Y(L.1E(4h-3O,2)+L.1E(4g-3U,2))};2I.93=u(2i,1f,5U){I 3R;B(5U==N){5U=3G}3R=2i+(L.dh()*(1f-2i));B(5U){o 3R.de(5U)}R{o L.7i(3R)}};2I.7g=u(A){o(0.27*A.r)+(0.67*A.g)+(0.d9*A.b)};2I.1N=u(1H,3A,3z,1s,7d,7c){I 8d,8e,6Z,6w,5V,68,1N,8F,4S,i,j,5F,6K,t,5Q,3O,4h,8o,5L,3U,4g,8m,H,1p,1q,T,3L;5Q=1H[0];5L=1H[1];3O=3A[0];3U=3A[1];4h=3z[0];4g=3z[1];8o=1s[0];8m=1s[1];1N={};5V=3*(3O-5Q);6Z=3*(4h-3O)-5V;8d=8o-5Q-5V-6Z;68=3*(3U-5L);6w=3*(4g-3U)-68;8e=8m-5L-68-6w;1d(i=H=0;H<9x;i=++H){t=i/9x;8F=L.7i((8d*L.1E(t,3))+(6Z*L.1E(t,2))+(5V*t)+5Q);4S=L.7i((8e*L.1E(t,3))+(6w*L.1E(t,2))+(68*t)+5L);B(7d&&4S<7d){4S=7d}R B(7c&&4S>7c){4S=7c}1N[8F]=4S}B(1N.1m<1s[0]+1){1d(i=1p=0,T=1s[0];0<=T?1p<=T:1p>=T;i=0<=T?++1p:--1p){B(!(1N[i]!=N)){5F=[i-1,1N[i-1]];1d(j=1q=i,3L=1s[0];i<=3L?1q<=3L:1q>=3L;j=i<=3L?++1q:--1q){B(1N[j]!=N){6K=[j,1N[j]];2U}}1N[i]=5F[1]+((6K[1]-5F[1])/(6K[0]-5F[0]))*(i-5F[0])}}}B(!(1N[1s[0]]!=N)){1N[1s[0]]=1N[1s[0]-1]}o 1N};o 2I})();1R=(u(){1R.1a=\'1R\';u 1R(){}1R.6V=u(4E){I b,g,r;B(4E.ap(0)==="#"){4E=4E.4J(1)}r=3q(4E.4J(0,2),16);g=3q(4E.4J(2,2),16);b=3q(4E.4J(4,2),16);o{r:r,g:g,b:b}};1R.d7=u(r,g,b){I d,h,l,1f,2i,s;B(1A r==="3p"){g=r.g;b=r.b;r=r.r}r/=C;g/=C;b/=C;1f=L.1f(r,g,b);2i=L.2i(r,g,b);l=(1f+2i)/2;B(1f===2i){h=s=0}R{d=1f-2i;s=l>0.5?d/(2-1f-2i):d/(1f+2i);h=(u(){4G(1f){1M r:o(g-b)/d+(g<b?6:0);1M g:o(b-r)/d+2;1M b:o(r-g)/d+4}})();h/=6}o{h:h,s:s,l:l}};1R.d3=u(h,s,l){I b,g,p,q,r;B(1A h==="3p"){s=h.s;l=h.l;h=h.h}B(s===0){r=g=b=l}R{q=l<0.5?l*(1+s):l+s-l*s;p=2*l-q;r=m.7f(p,q,h+1/3);g=m.7f(p,q,h);b=m.7f(p,q,h-1/3)}o{r:r*C,g:g*C,b:b*C}};1R.7f=u(p,q,t){B(t<0){t+=1}B(t>1){t-=1}B(t<1/6){o p+(q-p)*6*t}B(t<1/2){o q}B(t<2/3){o p+(q-p)*(2/3-t)*6}o p};1R.9Z=u(r,g,b){I d,h,1f,2i,s,v;r/=C;g/=C;b/=C;1f=L.1f(r,g,b);2i=L.2i(r,g,b);v=1f;d=1f-2i;s=1f===0?0:d/1f;B(1f===2i){h=0}R{h=(u(){4G(1f){1M r:o(g-b)/d+(g<b?6:0);1M g:o(b-r)/d+2;1M b:o(r-g)/d+4}})();h/=6}o{h:h,s:s,v:v}};1R.a4=u(h,s,v){I b,f,g,i,p,q,r,t;i=L.3d(h*6);f=h*6-i;p=v*(1-s);q=v*(1-f*s);t=v*(1-(1-f)*s);4G(i%6){1M 0:r=v;g=t;b=p;2U;1M 1:r=q;g=v;b=p;2U;1M 2:r=p;g=v;b=t;2U;1M 3:r=p;g=q;b=v;2U;1M 4:r=t;g=p;b=v;2U;1M 5:r=v;g=p;b=q}o{r:r*C,g:g*C,b:b*C}};1R.aw=u(r,g,b){I x,y,z;r/=C;g/=C;b/=C;B(r>0.84){r=L.1E((r+0.38)/1.38,2.4)}R{r/=12.92}B(g>0.84){g=L.1E((g+0.38)/1.38,2.4)}R{g/=12.92}B(b>0.84){b=L.1E((b+0.38)/1.38,2.4)}R{b/=12.92}x=r*0.d1+g*0.d0+b*0.cZ;y=r*0.9m+g*0.9q+b*0.9s;z=r*0.cT+g*0.cQ+b*0.cP;o{x:x*1h,y:y*1h,z:z*1h}};1R.cO=u(x,y,z){I b,g,r;x/=1h;y/=1h;z/=1h;r=(3.cN*x)+(-1.cL*y)+(-0.cJ*z);g=(-0.cI*x)+(1.cH*y)+(0.cG*z);b=(0.cF*x)+(-0.cE*y)+(1.cD*z);B(r>0.7W){r=(1.38*L.1E(r,0.7V))-0.38}R{r*=12.92}B(g>0.7W){g=(1.38*L.1E(g,0.7V))-0.38}R{g*=12.92}B(b>0.7W){b=(1.38*L.1E(b,0.7V))-0.38}R{b*=12.92}o{r:r*C,g:g*C,b:b*C}};1R.9O=u(x,y,z){I a,b,l,7U,7T,7S;B(1A x==="3p"){y=x.y;z=x.z;x=x.x}7U=95.9T;7T=1h.0;7S=7R.9Y;x/=7U;y/=7T;z/=7S;B(x>0.7Q){x=L.1E(x,0.7O)}R{x=(7.7L*x)+0.5i}B(y>0.7Q){y=L.1E(y,0.7O)}R{y=(7.7L*y)+0.5i}B(z>0.7Q){z=L.1E(z,0.7O)}R{z=(7.7L*z)+0.5i}l=aq*y-16;a=av*(x-y);b=5h*(y-z);o{l:l,a:a,b:b}};1R.cC=u(l,a,b){I x,y,z;B(1A l==="3p"){a=l.a;b=l.b;l=l.l}y=(l+16)/aq;x=y+(a/av);z=y-(b/5h);B(x>0.7K){x=x*x*x}R{x=0.7H*(x-0.5i)}B(y>0.7K){y=y*y*y}R{y=0.7H*(y-0.5i)}B(z>0.7K){z=z*z*z}R{z=0.7H*(z-0.5i)}o{x:x*95.9T,y:y*1h.0,z:z*7R.9Y}};1R.cB=u(r,g,b){I 7G;B(1A r==="3p"){g=r.g;b=r.b;r=r.r}7G=m.aw(r,g,b);o m.9O(7G)};1R.cA=u(l,a,b){};o 1R})();2J=(u(){2J.1a=\'2J\';u 2J(){}2J.4B={};2J.9d=["9f","9h","9i"];2J.7y=u(3t,1j,2j){I 61,H,2L,T,2X;B(m.4B[1j]&&m.4B[1j].1m){T=m.4B[1j];2X=[];1d(H=0,2L=T.1m;H<2L;H++){61=T[H];B(61.3t===N||3t.X===61.3t.X){2X.2V(61.6b.2K(3t,2j))}R{2X.2V(6X 0)}}o 2X}};2J.cz=u(3t,1j,6b){I 7C,8c;B(1A 3t==="4e"){8c=3t;7C=1j;3t=N;1j=8c;6b=7C}B(9j.2K(m.9d,1j)<0){o 3G}B(!m.4B[1j]){m.4B[1j]=[]}m.4B[1j].2V({3t:3t,6b:6b});o 4M};o 2J})();P.2J=2J;G=(u(){G.1a=\'G\';u G(){}G.1Q={7B:1,7D:2,7M:3,8K:4,7P:5,2b:6};G.M=u(1a,9G){o 1o.1b[1a]=9G};G.1b.cy=u(1r){I 1y=m;B(1r==N){1r=u(){}}o m.6g(u(){1y.1C.b6(1y.43,0,0);o 1r.2K(1y)})};G.1b.cx=u(9L){o m.6m(m.1v.S,m.1v.K,9L)};G.1b.29=u(1a,7p){m.3Q.2V({1j:G.1Q.7B,1a:1a,7p:7p});o m};G.1b.3e=u(1a,J,2R,3r){I i,H,T;B(!2R){2R=0;1d(i=H=0,T=J.1m;0<=T?H<T:H>T;i=0<=T?++H:--H){2R+=J[i]}}m.3Q.2V({1j:G.1Q.7D,1a:1a,J:J,2R:2R,3r:3r||0});o m};G.1b.51=u(42,2q){m.3Q.2V({1j:G.1Q.2b,42:42,2q:2q});o m};G.1b.6g=u(4X){I 1L,1y=m;B(1A 4X==="u"){m.4X=4X}B(m.3Q.1m===0){B(m.4X!=N){2J.7y(m,"9i");m.4X.2K(m)}o m}1L=m.3Q.a0();o 1W.3V(m,1L,u(){o 1y.6g()})};G.1b.2G=u(1r){I 26;26=1U 2P(m);m.8x.2V(26);m.3Q.2V({1j:G.1Q.7M});1r.2K(26);m.3Q.2V({1j:G.1Q.8K});o m};G.1b.a5=u(26){m.a6(26);o m.6g()};G.1b.a6=u(26){m.8t.2V(m.5W);m.5N.2V(m.Z);m.5W=26;o m.Z=26.Z};G.1b.a7=u(){m.Z=m.5N.a8();o m.5W=m.8t.a8()};G.1b.a9=u(){o m.5W.ab()};o G})();1u.5d(1o.1b,G.1b);P.G=G;1Y=(u(){1Y.1a=\'1Y\';u 1Y(){}1Y.ac=/(?:(?:cw|cv):\\/\\/)((?:\\w+)\\.(?:(?:\\w|\\.)+))/;1Y.85=u(3c){I 7h;B(!3c){o}7h=3c.cu(m.ac);B(7h){o 7h[1]!==2o.ct}R{o 3G}};1Y.6Y=u(1V){B(m.85(1V)){B(!P.6I.1m){2O.89("cs 8W cr a 91 S cq a cp 99. co: "+1V)}R{B(P.85(P.6I)){2O.89("cn cm a 91 99 1d cl ck.");o}o""+P.6I+"?cj="+(ci(1V))}}};1Y.ch=u(4K){I 79;79={cg:\'cf\',ce:\'cd\',cc:\'ca\',c9:\'c8\'};4K=4K.4q();B(79[4K]!=N){4K=79[4K]}o"c7/c6."+4K};1Y.1b.c5=u(){B(1A 2x!=="4s"&&2x!==N){o m.9D.3Y(m,1l)}R{o m.9E.3Y(m,1l)}};1Y.1b.9E=u(1j){I S;B(1j==N){1j="9F"}1j=1j.4q();S=m.8g(1j).c4("S/"+1j,"S/c3-c2");o 2o.c1.c0=S};1Y.1b.9D=u(3y,6W){I 8j;B(6W==N){6W=4M}bZ{8j=4W.bY(3y);B(8j.bX()&&!6W){o 3G}}bW(e){2O.3E("bV bU 3y "+3y)}o 4W.bT(3y,m.K.bS(),u(){o 2O.3E("bQ bP 8W "+3y)})};1Y.1b.bO=u(1j){I 1T;1T=2o.41(\'1T\');1T.1V=m.8g(1j);o 1T};1Y.1b.8g=u(1j){B(1j==N){1j="9F"}1j=1j.4q();o m.K.bN("S/"+1j)};o 1Y})();1u.5d(1o.1b,1Y.1b);P.1Y=1Y;2P=(u(){2P.1a=\'2P\';u 2P(c){m.c=c;m.1F=m.c;m.1v={8p:\'8q\',2f:1.0};m.bM=1u.5k.3C();m.K=1A 2x!=="4s"&&2x!==N?1U 2S():2o.41(\'K\');m.K.E=m.c.1c.E;m.K.F=m.c.1c.F;m.1C=m.K.4w(\'2d\');m.1C.bL(m.K.E,m.K.F);m.43=m.1C.53(0,0,m.K.E,m.K.F);m.Z=m.43.2j}2P.1b.2G=u(cb){o m.c.2G.2K(m.c,cb)};2P.1b.3f=u(aa){m.1v.8p=aa;o m};2P.1b.2f=u(2f){m.1v.2f=2f/1h;o m};2P.1b.3M=u(){I i,2H,H,T;2H=m.c.Z;1d(i=H=0,T=m.c.Z.1m;H<T;i=H+=4){m.Z[i]=2H[i];m.Z[i+1]=2H[i+1];m.Z[i+2]=2H[i+2];m.Z[i+3]=2H[i+3]}o m};2P.1b.4j=u(){o m.c.4j.3Y(m.c,1l)};2P.1b.bK=u(S){B(1A S==="3p"){S=S.1V}R B(1A S==="4e"&&S[0]==="#"){S=$(S).1V}B(!S){o m}m.c.3Q.2V({1j:G.1Q.7P,1V:S,26:m});o m};2P.1b.ab=u(){I i,4A,2H,1D,V,O,H,T,2X;2H=m.c.5N[m.c.5N.1m-1];4A=m.c.Z;2X=[];1d(i=H=0,T=4A.1m;H<T;i=H+=4){O={r:2H[i],g:2H[i+1],b:2H[i+2],a:2H[i+3]};V={r:4A[i],g:4A[i+1],b:4A[i+2],a:4A[i+3]};1D=1X.3V(m.1v.8p,V,O);1D.r=1u.3s(1D.r);1D.g=1u.3s(1D.g);1D.b=1u.3s(1D.b);B(!(1D.a!=N)){1D.a=V.a}2H[i]=O.r-((O.r-1D.r)*(m.1v.2f*(1D.a/C)));2H[i+1]=O.g-((O.g-1D.g)*(m.1v.2f*(1D.a/C)));2X.2V(2H[i+2]=O.b-((O.b-1D.b)*(m.1v.2f*(1D.a/C))))}o 2X};o 2P})();4R=(u(){4R.1a=\'4R\';u 4R(){I 1a,H,2L,T;T=[\'ar\',\'89\',\'bI\',\'at\'];1d(H=0,2L=T.1m;H<2L;H++){1a=T[H];m[1a]=(u(1a){o u(){B(!P.9a){o}o au[1a].3Y(au,1l)}})(1a)}m.3E=m.ar}o 4R})();2O=1U 4R();2Z=(u(){2Z.1a=\'2Z\';u 2Z(c){m.c=c;m.Q=0}2Z.1b.8B=u(){I x,y;y=m.c.1c.F-L.3d(m.Q/(m.c.1c.E*4));x=(m.Q%(m.c.1c.E*4))/4;o{x:x,y:y}};2Z.1b.ax=u(6t,6s){I 2T;2T=m.Q+(m.c.1c.E*4*(6s*-1))+(4*6t);B(2T>m.c.Z.1m||2T<0){o{r:0,g:0,b:0,a:0}}o{r:m.c.Z[2T],g:m.c.Z[2T+1],b:m.c.Z[2T+2],a:m.c.Z[2T+3]}};2Z.1b.bH=u(6t,6s,A){I 8P;8P=m.Q+(m.c.1c.E*4*(6s*-1))+(4*6t);B(2T>m.c.Z.1m||2T<0){o}m.c.Z[2T]=A.r;m.c.Z[2T+1]=A.g;m.c.Z[2T+2]=A.b;m.c.Z[2T+3]=A.a;o 4M};2Z.1b.bG=u(x,y){I Q;Q=(y*m.c.1c.E+x)*4;o{r:m.c.Z[Q],g:m.c.Z[Q+1],b:m.c.Z[Q+2],a:m.c.Z[Q+3]}};2Z.1b.bF=u(x,y,A){I Q;Q=(y*m.c.1c.E+x)*4;m.c.Z[Q]=A.r;m.c.Z[Q+1]=A.g;m.c.Z[Q+2]=A.b;o m.c.Z[Q+3]=A.a};o 2Z})();2b=(u(){2b.1a=\'2b\';u 2b(){}2b.8D={};2b.M=u(1a,42){o m.8D[1a]=42};2b.3V=u(1C,1a,2q){o m.8D[1a].3Y(1C,2q)};o 2b})();P.2b=2b;1W=(u(){1W.1a=\'1W\';1W.5A=4;1W.3V=u(4U,1K,1r){I 26,6a;6a=1U 1W(4U,1K,1r);4G(1K.1j){1M G.1Q.7M:26=4U.8x.a0();4U.a5(26);2U;1M G.1Q.8K:4U.a9();4U.a7();1r();2U;1M G.1Q.7P:6a.9b(1K.26,1K.1V);2U;1M G.1Q.2b:6a.9c();2U;dV:6a.9e()}o 4U};u 1W(c,1K,6c){m.c=c;m.1K=1K;m.6c=6c}1W.1b.9e=u(){I 6d,8I,1s,j,8J,n,1H,H,T,2X,1y=m;m.7N=0;n=m.c.Z.1m;8I=L.3d((n/4)/1W.5A);6d=8I*4;8J=6d+((n/4)%1W.5A)*4;2J.7y(m.c,"9f",m.1K);B(m.1K.1j===G.1Q.7B){2X=[];1d(j=H=0,T=1W.5A;0<=T?H<T:H>T;j=0<=T?++H:--H){1H=j*6d;1s=1H+(j===1W.5A-1?8J:6d);2X.2V(bE((u(j,1H,1s){o u(){o 1y.9o(j,1H,1s)}})(j,1H,1s),0))}o 2X}R{o m.9p()}};1W.1b.9c=u(){2O.3E("bD 42 "+m.1K.42);2b.3V(m.c,m.1K.42,m.1K.2q);2O.3E("2b "+m.1K.42+" 6j!");o m.6c()};1W.1b.9o=u(3P,1H,1s){I 2j,i,4r,33,H;2O.3E("bC #"+3P+" - G: "+m.1K.1a+", bB: "+1H+", bA: "+1s);2j={r:0,g:0,b:0,a:0};4r=1U 2Z(m.c);1d(i=H=1H;H<1s;i=H+=4){4r.Q=i;2j.r=m.c.Z[i];2j.g=m.c.Z[i+1];2j.b=m.c.Z[i+2];2j.a=m.c.Z[i+3];33=m.1K.7p.2K(4r,2j);B(!(33.a!=N)){33.a=2j.a}m.c.Z[i]=1u.3s(33.r);m.c.Z[i+1]=1u.3s(33.g);m.c.Z[i+2]=1u.3s(33.b);m.c.Z[i+3]=1u.3s(33.a)}o m.8E(3P)};1W.1b.9p=u(){I J,65,3r,2E,5w,2R,1s,i,j,k,2t,4z,n,1a,5X,4r,33,1H,H,1p,1q,2s;1a=m.1K.1a;3r=m.1K.3r;2R=m.1K.2R;n=m.c.Z.1m;J=m.1K.J;65=L.7Y(J.1m);2t=[];4z=[];2O.3E("bz 2t - G: "+m.1K.1a);1H=m.c.1c.E*4*((65-1)/2);1s=n-(m.c.1c.E*4*((65-1)/2));2E=(65-1)/2;4r=1U 2Z(m.c);1d(i=H=1H;H<1s;i=H+=4){4r.Q=i;5w=0;1d(j=1p=-2E;-2E<=2E?1p<=2E:1p>=2E;j=-2E<=2E?++1p:--1p){1d(k=1q=2E;2E<=-2E?1q<=-2E:1q>=-2E;k=2E<=-2E?++1q:--1q){5X=4r.ax(j,k);2t[5w*3]=5X.r;2t[5w*3+1]=5X.g;2t[5w*3+2]=5X.b;5w++}}33=m.3e(J,2t,2R,3r);4z[i]=1u.3s(33.r);4z[i+1]=1u.3s(33.g);4z[i+2]=1u.3s(33.b);4z[i+3]=m.c.Z[i+3]}1d(i=2s=1H;1H<=1s?2s<1s:2s>1s;i=1H<=1s?++2s:--2s){m.c.Z[i]=4z[i]}o m.8E(-1)};1W.1b.8E=u(3P){B(3P>=0){2O.3E("by #"+3P+" 6j! G: "+m.1K.1a)}m.7N++;B(m.7N===1W.5A||3P===-1){B(3P>=0){2O.3E("G "+m.1K.1a+" 6j!")}B(3P<0){2O.3E("7D 1F "+m.1K.1a+" 6j!")}2J.7y(m.c,"9h",m.1K);o m.6c()}};1W.1b.3e=u(J,2t,2R,3r){I i,2C,H,T;2C={r:0,g:0,b:0};1d(i=H=0,T=J.1m;0<=T?H<T:H>T;i=0<=T?++H:--H){2C.r+=J[i]*2t[i*3];2C.g+=J[i]*2t[i*3+1];2C.b+=J[i]*2t[i*3+2]}2C.r=(2C.r/2R)+3r;2C.g=(2C.g/2R)+3r;2C.b=(2C.b/2R)+3r;o 2C};1W.1b.9b=u(26,1V){I 1T,6A,1y=m;1T=2o.41(\'1T\');1T.5S=u(){26.1C.5Y(1T,0,0,1y.c.1c.E,1y.c.1c.F);26.43=26.1C.53(0,0,1y.c.1c.E,1y.c.1c.F);26.Z=26.43.2j;1y.c.Z=26.Z;o 1y.c.6g()};6A=1Y.6Y(1V);o 1T.1V=6A!=N?6A:1V};o 1W})();1Z=(u(){1Z.1a=\'1Z\';u 1Z(){}1Z.5r={};1Z.76=u(4C){o m.5r[4C]!=N};1Z.3C=u(4C){o m.5r[4C]};1Z.aL=u(1a,7x){o m.5r[1a]=7x};1Z.3V=u(4C,1r){o 1r.2K(m.3C(4C),m.3C(4C))};1Z.bx=u(1a){B(1a==N){1a=3G}B(1a){o 9N m.5r[1a]}R{o m.5r={}}};o 1Z})();P.1Z=1Z;1X.M("8q",u(V,O){o{r:V.r,g:V.g,b:V.b}});1X.M("5n",u(V,O){o{r:(V.r*O.r)/C,g:(V.g*O.g)/C,b:(V.b*O.b)/C}});1X.M("bw",u(V,O){o{r:C-(((C-V.r)*(C-O.r))/C),g:C-(((C-V.g)*(C-O.g))/C),b:C-(((C-V.b)*(C-O.b))/C)}});1X.M("6G",u(V,O){I 1D;1D={};1D.r=O.r>1e?C-2*(C-V.r)*(C-O.r)/C:(O.r*V.r*2)/C;1D.g=O.g>1e?C-2*(C-V.g)*(C-O.g)/C:(O.g*V.g*2)/C;1D.b=O.b>1e?C-2*(C-V.b)*(C-O.b)/C:(O.b*V.b*2)/C;o 1D});1X.M("bv",u(V,O){o{r:V.r-O.r,g:V.g-O.g,b:V.b-O.b}});1X.M("9S",u(V,O){o{r:O.r+V.r,g:O.g+V.g,b:O.b+V.b}});1X.M("bu",u(V,O){o{r:1e-2*(O.r-1e)*(V.r-1e)/C,g:1e-2*(O.g-1e)*(V.g-1e)/C,b:1e-2*(O.b-1e)*(V.b-1e)/C}});1X.M("9U",u(V,O){I 1D;1D={};1D.r=O.r>1e?C-((C-O.r)*(C-(V.r-1e)))/C:(O.r*(V.r+1e))/C;1D.g=O.g>1e?C-((C-O.g)*(C-(V.g-1e)))/C:(O.g*(V.g+1e))/C;1D.b=O.b>1e?C-((C-O.b)*(C-(V.b-1e)))/C:(O.b*(V.b+1e))/C;o 1D});1X.M("bt",u(V,O){o{r:O.r>V.r?O.r:V.r,g:O.g>V.g?O.g:V.g,b:O.b>V.b?O.b:V.b}});1X.M("bs",u(V,O){o{r:O.r>V.r?V.r:O.r,g:O.g>V.g?V.g:O.g,b:O.b>V.b?V.b:O.b}});G.M("4j",u(){I 2Y;B(1l.1m===1){2Y=1R.6V(1l[0])}R{2Y={r:1l[0],g:1l[1],b:1l[2]}}o m.29("4j",u(A){A.r=2Y.r;A.g=2Y.g;A.b=2Y.b;A.a=C;o A})});G.M("37",u(J){J=L.3d(C*(J/1h));o m.29("37",u(A){A.r+=J;A.g+=J;A.b+=J;o A})});G.M("3u",u(J){J*=-0.br;o m.29("3u",u(A){I 1f;1f=L.1f(A.r,A.g,A.b);B(A.r!==1f){A.r+=(1f-A.r)*J}B(A.g!==1f){A.g+=(1f-A.g)*J}B(A.b!==1f){A.b+=(1f-A.b)*J}o A})});G.M("3F",u(J){J*=-1;o m.29("3F",u(A){I 1k,4l,1f;1f=L.1f(A.r,A.g,A.b);4l=(A.r+A.g+A.b)/3;1k=((L.4p(1f-4l)*2/C)*J)/1h;B(A.r!==1f){A.r+=(1f-A.r)*1k}B(A.g!==1f){A.g+=(1f-A.g)*1k}B(A.b!==1f){A.b+=(1f-A.b)*1k}o A})});G.M("4d",u(J){o m.29("4d",u(A){I 4l;4l=0.3*A.r+0.59*A.g+0.11*A.b;A.r=4l;A.g=4l;A.b=4l;o A})});G.M("2g",u(J){J=L.1E((J+1h)/1h,2);o m.29("2g",u(A){A.r/=C;A.r-=0.5;A.r*=J;A.r+=0.5;A.r*=C;A.g/=C;A.g-=0.5;A.g*=J;A.g+=0.5;A.g*=C;A.b/=C;A.b-=0.5;A.b*=J;A.b+=0.5;A.b*=C;o A})});G.M("8h",u(J){o m.29("8h",u(A){I h,4Q,2u;4Q=1R.9Z(A.r,A.g,A.b);h=4Q.h*1h;h+=L.4p(J);h=h%1h;h/=1h;4Q.h=h;2u=1R.a4(4Q.h,4Q.s,4Q.v);2u.a=A.a;o 2u})});G.M("3X",u(){I 57,2u;B(1l.1m===2){2u=1R.6V(1l[0]);57=1l[1]}R B(1l.1m===4){2u={r:1l[0],g:1l[1],b:1l[2]};57=1l[3]}o m.29("3X",u(A){A.r-=(A.r-2u.r)*(57/1h);A.g-=(A.g-2u.g)*(57/1h);A.b-=(A.b-2u.b)*(57/1h);o A})});G.M("ad",u(){o m.29("ad",u(A){A.r=C-A.r;A.g=C-A.g;A.b=C-A.b;o A})});G.M("3Z",u(J){B(J==N){J=1h}J/=1h;o m.29("3Z",u(A){A.r=L.2i(C,(A.r*(1-(0.bq*J)))+(A.g*(0.bp*J))+(A.b*(0.bo*J)));A.g=L.2i(C,(A.r*(0.bn*J))+(A.g*(1-(0.bm*J)))+(A.b*(0.bl*J)));A.b=L.2i(C,(A.r*(0.bk*J))+(A.g*(0.bj*J))+(A.b*(1-(0.bi*J))));o A})});G.M("2k",u(J){o m.29("2k",u(A){A.r=L.1E(A.r/C,J)*C;A.g=L.1E(A.g/C,J)*C;A.b=L.1E(A.b/C,J)*C;o A})});G.M("73",u(J){J=L.4p(J)*2.55;o m.29("73",u(A){I 3R;3R=2I.93(J*-1,J);A.r+=3R;A.g+=3R;A.b+=3R;o A})});G.M("74",u(J){J=L.4p(J)*2.55;o m.29("74",u(A){B(A.r>C-J){A.r=C}R B(A.r<J){A.r=0}B(A.g>C-J){A.g=C}R B(A.g<J){A.g=0}B(A.b>C-J){A.b=C}R B(A.b<J){A.b=0}o A})});G.M("3l",u(1v){I 4Y,8f;B(1A 1v!=="3p"){o m}1d(4Y 7X 1v){B(!82.2K(1v,4Y))7o;8f=1v[4Y];B(8f===0){9N 1v[4Y];7o}1v[4Y]/=1h}B(1v.1m===0){o m}o m.29("3l",u(A){B(1v.31!=N){B(1v.31>0){A.r+=(C-A.r)*1v.31}R{A.r-=A.r*L.4p(1v.31)}}B(1v.4u!=N){B(1v.4u>0){A.g+=(C-A.g)*1v.4u}R{A.g-=A.g*L.4p(1v.4u)}}B(1v.3D!=N){B(1v.3D>0){A.b+=(C-A.b)*1v.3D}R{A.b-=A.b*L.4p(1v.3D)}}o A})});G.M("2c",u(4T,1H,3A,3z,1s){I 1N,i,H,1p,T,3L;B(1A 4T==="4e"){4T=4T.bh("")}1N=2I.1N(1H,3A,3z,1s,0,C);B(1H[0]>0){1d(i=H=0,T=1H[0];0<=T?H<T:H>T;i=0<=T?++H:--H){1N[i]=1H[1]}}B(1s[0]<C){1d(i=1p=3L=1s[0];3L<=C?1p<=C:1p>=C;i=3L<=C?++1p:--1p){1N[i]=1s[1]}}o m.29("2c",u(A){I i,1q,5l;1d(i=1q=0,5l=4T.1m;0<=5l?1q<5l:1q>5l;i=0<=5l?++1q:--1q){A[4T[i]]=1N[A[4T[i]]]}o A})});G.M("2N",u(J){I 3A,3z,p;p=L.4p(J)/1h;3A=[0,C*p];3z=[C-(C*p),C];B(J<0){3A=3A.8M();3z=3z.8M()}o m.2c(\'2u\',[0,0],3A,3z,[C,C])});P.G.M("bg",u(){o m.3e("bf 5P",[1,1,1,1,1,1,1,1,1])});P.G.M("8Q",u(){o m.3e("8R 5P",[0,1,0,1,1,1,0,1,0])});P.G.M("be",u(){o m.3e("bd 8R 5P",[0,0,1,0,0,0,1,1,1,0,1,1,1,1,1,0,1,1,1,0,0,0,1,0,0])});P.G.M("bc",u(){o m.3e("bb 5P",[1,4,6,4,1,4,16,24,16,4,6,24,36,24,6,4,16,24,16,4,1,4,6,4,1])});P.G.M("ba",u(){I 2t;B(4t===0||4t===4L){2t=[0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0]}R B((4t>0&&4t<90)||(4t>4L&&4t<94)){2t=[0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0]}R B(4t===90||4t===94){2t=[0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0]}R{2t=[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1]}o m.3e("b9 5P",2t)});P.G.M("6h",u(1k){B(1k==N){1k=1h}1k/=1h;o m.3e("b8",[0,-1k,0,-1k,4*1k+1,-1k,0,-1k,0])});86={37:u(A,1k,D){A.r=A.r-(A.r*1k*D.32);A.g=A.g-(A.g*1k*D.32);A.b=A.b-(A.b*1k*D.32);o A},2k:u(A,1k,D){A.r=L.1E(A.r/C,L.1f(10*1k*D.32,1))*C;A.g=L.1E(A.g/C,L.1f(10*1k*D.32,1))*C;A.b=L.1E(A.b/C,L.1f(10*1k*D.32,1))*C;o A},3X:u(A,1k,D){A.r-=(A.r-D.2Y.r)*1k;A.g-=(A.g-D.2Y.g)*1k;A.b-=(A.b-D.2Y.b)*1k;o A}};G.M("1O",u(1n,32){I 1N,34,1s,1H;B(32==N){32=60}B(1A 1n==="4e"&&1n.4J(-1)==="%"){B(m.1c.F>m.1c.E){1n=m.1c.E*(3q(1n.4J(0,1n.1m-1),10)/1h)}R{1n=m.1c.F*(3q(1n.4J(0,1n.1m-1),10)/1h)}}32/=1h;34=[m.1c.E/2,m.1c.F/2];1H=L.7Y(L.1E(34[0],2)+L.1E(34[1],2));1s=1H-1n;1N=2I.1N([0,1],[30,30],[70,60],[1h,80]);o m.29("1O",u(A){I 7s,2w,Q;Q=m.8B();7s=2I.4I(Q.x,Q.y,34[0],34[1]);B(7s>1s){2w=L.1f(1,(1N[L.7i(((7s-1s)/1n)*1h)]/10)*32);A.r=L.1E(A.r/C,2w)*C;A.g=L.1E(A.g/C,2w)*C;A.b=L.1E(A.b/C,2w)*C}o A})});G.M("9k",u(D){I 3W,5b,7w,1n,H,2L,T;3W={32:50,2v:0,7F:\'37\',2Y:{r:0,g:0,b:0}};D=1u.5d(3W,D);B(!D.1n){o m}R B(1A D.1n==="4e"){7w=3q(D.1n,10)/1h;D.1n={E:m.1c.E*7w,F:m.1c.F*7w}}R B(1A D.1n==="3p"){T=["E","F"];1d(H=0,2L=T.1m;H<2L;H++){5b=T[H];B(1A D.1n[5b]==="4e"){D.1n[5b]=m.1c[5b]*(3q(D.1n[5b],10)/1h)}}}R B(D.1n==="b7"){1n=D.1n;D.1n={E:1n,F:1n}}B(1A D.2v==="4e"){D.2v=(D.1n.E/2)*(3q(D.2v,10)/1h)}D.32/=1h;D.1n.E=L.3d(D.1n.E);D.1n.F=L.3d(D.1n.F);D.S={E:m.1c.E,F:m.1c.F};B(D.7F==="3X"&&1A D.2Y==="4e"){D.2Y=1R.6V(D.2Y)}D.1S={4P:(m.1c.E-D.1n.E)/2,5e:m.1c.E-D.1S.4P,4H:(m.1c.F-D.1n.F)/2,5f:m.1c.F-D.1S.4H};D.1t=[{x:D.1S.4P+D.2v,y:D.1S.5f-D.2v},{x:D.1S.5e-D.2v,y:D.1S.5f-D.2v},{x:D.1S.5e-D.2v,y:D.1S.4H+D.2v},{x:D.1S.4P+D.2v,y:D.1S.4H+D.2v}];D.3T=2I.4I(0,0,D.1t[3].x,D.1t[3].y)-D.2v;o m.29("9k",u(A){I 1k,Q,3S;Q=m.8B();B((Q.x>D.1t[0].x&&Q.x<D.1t[1].x)&&(Q.y>D.1S.4H&&Q.y<D.1S.5f)){o A}B((Q.x>D.1S.4P&&Q.x<D.1S.5e)&&(Q.y>D.1t[3].y&&Q.y<D.1t[2].y)){o A}B(Q.x>D.1t[0].x&&Q.x<D.1t[1].x&&Q.y>D.1S.5f){1k=(Q.y-D.1S.5f)/D.3T}R B(Q.y>D.1t[2].y&&Q.y<D.1t[1].y&&Q.x>D.1S.5e){1k=(Q.x-D.1S.5e)/D.3T}R B(Q.x>D.1t[0].x&&Q.x<D.1t[1].x&&Q.y<D.1S.4H){1k=(D.1S.4H-Q.y)/D.3T}R B(Q.y>D.1t[2].y&&Q.y<D.1t[1].y&&Q.x<D.1S.4P){1k=(D.1S.4P-Q.x)/D.3T}R B(Q.x<=D.1t[0].x&&Q.y>=D.1t[0].y){3S=P.4I(Q.x,Q.y,D.1t[0].x,D.1t[0].y);1k=(3S-D.2v)/D.3T}R B(Q.x>=D.1t[1].x&&Q.y>=D.1t[1].y){3S=P.4I(Q.x,Q.y,D.1t[1].x,D.1t[1].y);1k=(3S-D.2v)/D.3T}R B(Q.x>=D.1t[2].x&&Q.y<=D.1t[2].y){3S=P.4I(Q.x,Q.y,D.1t[2].x,D.1t[2].y);1k=(3S-D.2v)/D.3T}R B(Q.x<=D.1t[3].x&&Q.y<=D.1t[3].y){3S=P.4I(Q.x,Q.y,D.1t[3].x,D.1t[3].y);1k=(3S-D.2v)/D.3T}B(1k<0){o A}o 86[D.7F](A,1k,D)})});(u(){I 4v,7I,7J,5g,5j;5g=[2F,2F,2M,2F,3a,2M,39,2F,3I,3a,3o,2M,3J,39,3K,2F,49,3I,47,3a,4o,3o,4k,2M,4b,3J,4a,39,2W,3K,4f,2F,5m,49,3H,3I,5o,47,5p,3a,2W,4o,5q,3o,44,4k,4i,2M,5s,4b,5t,3J,5u,4a,5v,39,5x,2W,5z,3K,5B,4f,3v,2F,6U,5m,6T,49,6S,3H,6R,3I,6P,5o,6O,47,4n,5p,6N,3a,5E,2W,6M,4o,6L,5q,4x,3o,3v,44,6H,4k,6F,4i,6E,2M,6C,5s,3H,4b,6B,5t,6z,3J,6y,5u,6x,4a,4n,5v,5G,39,6v,5x,6u,2W,6r,5z,6q,3K,58,5B,4x,4f,6p,3v,6o,2F,az,6U,aA,5m,4i,6T,aB,49,aC,6S,aD,3H,aE,6R,aF,3I,aG,6P,aH,5o,aI,6O,aJ,47,aK,4n,6n,5p,5G,6N,6l,3a,aN,5E,aO,2W,aP,6M,aQ,4o,6k,6L,58,5q,aS,4x,aT,3o,aU,3v,aV,44,aW,6H,aX,4k,aY,6F,aZ,4i,b0,6E,b1,2M,b2,6C,b3,5s,b4,3H,b5,4b,9r,6B,9g,5t,98,6z,96,3J,8Y,6y,8X,5u,8V,6x,8U,4a,8T,4n,6n,5v,8S,5G,8O,39,6l,6v,8N,5x,5E,6u,aM,2W,ao,6r,am,5z,al,6q,6k,3K,ak,58,aj,5B,ai,4x,ah,4f,3o,6p,ag,3v,af,6o,44];5j=[9,11,12,13,13,14,14,15,15,15,15,16,16,16,16,17,17,17,17,17,17,17,18,18,18,18,18,18,18,18,18,19,19,19,19,19,19,19,19,19,19,19,19,19,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24];7I=u(E,F,5C,5D,4y,1m,9n){I 3x,1C,2h,3O,4h,3U,4g;3x=1A 2x!=="4s"&&2x!==N?1U 2S():2o.41(\'K\');3x.E=E;3x.F=F;3O=5C+L.8L(4y)*1m*0.5;3U=5D+L.as(4y)*1m*0.5;4h=5C-L.8L(4y)*1m*0.5;4g=5D-L.as(4y)*1m*0.5;1C=3x.4w("2d");2h=1C.bJ(3O,3U,4h,4g);B(!9n){2h.4D(0,"6D");2h.4D(1,"8u")}R{2h.4D(0,"6D");2h.4D(0.5,"8u");2h.4D(1,"6D")}1C.a2=2h;1C.a1(0,0,E,F);o 1C.53(0,0,E,F)};7J=u(E,F,5C,5D,5J,5I){I 3x,1C,2h;3x=1A 2x!=="4s"&&2x!==N?1U 2S():2o.41(\'K\');3x.E=E;3x.F=F;1C=3x.4w("2d");2h=1C.bR(5C,5D,5J,5C,5D,5I);2h.4D(1,"6D");2h.4D(0,"8u");1C.a2=2h;1C.a1(0,0,E,F);o 1C.53(0,0,E,F)};4v=u(){m.r=0;m.g=0;m.b=0;m.a=0;o m.1L=N};P.2b.M("8l",u(9X,1P,9V,6Q){I 28,2r,1I,5c,62,2w,2a,2p,1G,F,3B,i,5T,2l,3b,71,3w,5O,2D,p,1x,1w,U,1z,2e,2m,1J,8b,W,2Q,2z,Y,3N,1i,1B,2A,4N,2B,7k,7q,56,E,3m,x,y,1g,48,46,H,1p,1q,2s,3g,3h,3i,3j,3k,4V;E=m.1c.E;F=m.1c.F;3b=m.Z;8b=9X.2j;7q=E*F;56=7q<<2;U=[];1d(i=H=0;0<=56?H<56:H>56;i=0<=56?++H:--H){U[i]=3b[i]}62=0;4N=6Q;6Q-=1;9A(4N-->=0){3w=(1P+0.5)|0;B(3w===0){7o}B(3w>69){3w=69}2w=3w+3w+1;7k=E<<2;3m=E-1;3B=F-1;W=3w+1;2B=W*(W+1)/2;2A=1U 4v();3N=6X 0;Y=2A;1d(i=1p=1;1<=2w?1p<2w:1p>2w;i=1<=2w?++1p:--1p){Y=Y.1L=1U 4v();B(i===W){3N=Y}}Y.1L=2A;1i=N;1B=N;46=1g=0;2D=5g[3w];2z=5j[3w];1d(y=1q=0;0<=F?1q<F:1q>F;y=0<=F?++1q:--1q){2e=2a=28=1J=1G=1I=0;2m=W*(1z=U[1g]);2p=W*(1w=U[1g+1]);2r=W*(1x=U[1g+2]);1J+=2B*1z;1G+=2B*1w;1I+=2B*1x;Y=2A;1d(i=2s=0;0<=W?2s<W:2s>W;i=0<=W?++2s:--2s){Y.r=1z;Y.g=1w;Y.b=1x;Y=Y.1L}1d(i=3g=1;1<=W?3g<W:3g>W;i=1<=W?++3g:--3g){p=1g+((3m<i?3m:i)<<2);1J+=(Y.r=(1z=U[p]))*(2Q=W-i);1G+=(Y.g=(1w=U[p+1]))*2Q;1I+=(Y.b=(1x=U[p+2]))*2Q;2e+=1z;2a+=1w;28+=1x;Y=Y.1L}1i=2A;1B=3N;1d(x=3h=0;0<=E?3h<E:3h>E;x=0<=E?++3h:--3h){U[1g]=(1J*2D)>>2z;U[1g+1]=(1G*2D)>>2z;U[1g+2]=(1I*2D)>>2z;1J-=2m;1G-=2p;1I-=2r;2m-=1i.r;2p-=1i.g;2r-=1i.b;p=(46+((p=x+W)<3m?p:3m))<<2;2e+=(1i.r=U[p]);2a+=(1i.g=U[p+1]);28+=(1i.b=U[p+2]);1J+=2e;1G+=2a;1I+=28;1i=1i.1L;2m+=(1z=1B.r);2p+=(1w=1B.g);2r+=(1x=1B.b);2e-=1z;2a-=1w;28-=1x;1B=1B.1L;1g+=4}46+=E}1d(x=3i=0;0<=E?3i<E:3i>E;x=0<=E?++3i:--3i){2a=28=2e=1G=1I=1J=0;1g=x<<2;2m=W*(1z=U[1g]);2p=W*(1w=U[1g+1]);2r=W*(1x=U[1g+2]);1J+=2B*1z;1G+=2B*1w;1I+=2B*1x;Y=2A;1d(i=3j=0;0<=W?3j<W:3j>W;i=0<=W?++3j:--3j){Y.r=1z;Y.g=1w;Y.b=1x;Y=Y.1L}48=E;1d(i=3k=1;1<=W?3k<W:3k>W;i=1<=W?++3k:--3k){1g=(48+x)<<2;1J+=(Y.r=(1z=U[1g]))*(2Q=W-i);1G+=(Y.g=(1w=U[1g+1]))*2Q;1I+=(Y.b=(1x=U[1g+2]))*2Q;2e+=1z;2a+=1w;28+=1x;Y=Y.1L;B(i<3B){48+=E}}1g=x;1i=2A;1B=3N;1d(y=4V=0;0<=F?4V<F:4V>F;y=0<=F?++4V:--4V){p=1g<<2;U[p]=(1J*2D)>>2z;U[p+1]=(1G*2D)>>2z;U[p+2]=(1I*2D)>>2z;1J-=2m;1G-=2p;1I-=2r;2m-=1i.r;2p-=1i.g;2r-=1i.b;p=(x+(((p=y+W)<3B?p:3B)*E))<<2;1J+=(2e+=(1i.r=U[p]));1G+=(2a+=(1i.g=U[p+1]));1I+=(28+=(1i.b=U[p+2]));1i=1i.1L;2m+=(1z=1B.r);2p+=(1w=1B.g);2r+=(1x=1B.b);2e-=1z;2a-=1w;28-=1x;1B=1B.1L;1g+=E}}1P*=9V;i=7q;9A(--i>-1){2l=i<<2;5O=(8b[2l+2]&cK)/C.0*6Q;71=5O|0;B(71===62){5c=69.0*(5O-(5O|0));5T=69-5c;3b[2l]=(3b[2l]*5T+U[2l]*5c)>>8;3b[2l+1]=(3b[2l+1]*5T+U[2l+1]*5c)>>8;3b[2l+2]=(3b[2l+2]*5T+U[2l+2]*5c)>>8}R B(71===62+1){3b[2l]=U[2l];3b[2l+1]=U[2l+1];3b[2l+2]=U[2l+2]}}62++}o m});P.G.M("cM",u(D){I 3W,2h;3W={34:{x:m.1c.E/2,y:m.1c.F/2},4y:45,9w:5h,7n:3,7l:1.5,4N:3};D=P.1u.5d(3W,D);D.4y*=L.cR/4L;2h=7I(m.1c.E,m.1c.F,D.34.x,D.34.y,D.4y,D.9w,4M);o m.51("8l",[2h,D.7n,D.7l,D.4N])});o P.G.M("8Q",u(D){I 3W,2h,5J,5I;3W={1n:50,34:{x:m.1c.E/2,y:m.1c.F/2},7n:3,7l:1.5,4N:3,1P:N};D=P.1u.5d(3W,D);B(!D.1P){D.1P=m.1c.E<m.1c.F?m.1c.F:m.1c.E}5J=(D.1P/2)-D.1n;5I=D.1P/2;2h=7J(m.1c.E,m.1c.F,D.34.x,D.34.y,5J,5I);o m.51("8l",[2h,D.7n,D.7l,D.4N])})})();P.G.M("cS",u(){o m.3e("9t cU",[0,0,0,-1,1,0,0,0,0])});P.G.M("cV",u(){o m.3e("9t cW",[-1,-1,-1,-1,8,-1,-1,-1,-1])});P.G.M("cX",u(){o m.3e("cY",[-2,-1,0,-1,1,1,0,1,2])});P.G.M("83",u(J){I 66,5Z;66=69/J;5Z=C/(J-1);o m.29("83",u(A){A.r=L.3d(L.3d(A.r/66)*5Z);A.g=L.3d(L.3d(A.g/66)*5Z);A.b=L.3d(L.3d(A.b/66)*5Z);o A})});P.G.M("d2",u(1O){B(1O==N){1O=4M}m.4d();m.2g(5);m.73(3);m.3Z(1h);m.3l({31:8,3D:2,4u:4});m.2k(0.87);B(1O){o m.1O("40%",30)}});P.G.M("d4",u(1O){B(1O==N){1O=4M}m.37(15);m.2N(15);m.2c(\'2u\',[0,0],[5h,0],[d5,C],[C,C]);m.3u(-20);m.2k(1.8);B(1O){m.1O("50%",60)}o m.37(5)});P.G.M("d6",u(78){B(78==N){78=3G}m.3F(20);m.2c(\'2u\',[5,0],[d8,9H],[88,da],[db,C]);m.6h(15);m.1O("45%",20);B(78){m.4d();m.2g(4)}o m});P.G.M("dc",u(){m.2g(1h);m.37(15);m.2N(10);m.83(80);m.74(30);o m.4d()});P.G.M("dd",u(){m.2N(3.5);m.3u(-5);m.3F(50);m.3Z(60);m.3X("#9B",10);m.3l({31:8,3D:8});m.2g(5);m.2k(1.2);o m.1O("55%",25)});P.G.M("df",u(){m.2N(5);m.3X("#9B",4);m.3Z(20);m.3l({3D:8,31:3});m.2c(\'b\',[0,0],[1h,9H],[4L,4L],[C,C]);m.2g(15);m.3F(75);o m.2k(1.6)});P.G.M("dg",u(){m.2c(\'2u\',[0,0],[1h,50],[9u,5h],[C,C]);m.3F(-30);m.3u(-30);m.3X(\'#di\',30);m.2g(-5);o m.2k(1.4)});P.G.M("dj",u(){m.37(5);m.2N(8);m.2g(4);m.3X(\'#dk\',30);m.3F(50);o m.2k(1.3)});P.G.M("dl",u(){m.2k(1.5);m.74(25);m.3u(-60);m.2g(5);m.73(5);o m.1O("50%",30)});P.G.M("dm",u(){m.3u(-35);m.2c(\'b\',[20,0],[90,7e],[dp,97],[C,9J]);m.2c(\'r\',[0,0],[97,90],[ds,7e],[C,C]);m.2c(\'g\',[10,0],[dt,du],[dv,1h],[C,dw]);m.2c(\'2u\',[0,0],[7e,1h],[1e,9u],[C,C]);o m.6h(20)});P.G.M("dx",u(){m.4d();m.3Z(10);m.2N(10);m.2g(15);o m.1O("60%",35)});P.G.M("dy",u(){m.3u(-20);m.3F(-50);m.2k(1.1);m.3Z(30);m.3l({31:-10,3D:5});m.2c(\'2u\',[0,0],[80,50],[1e,9J],[C,C]);o m.1O("60%",30)});P.G.M("dz",u(1O){B(1O==N){1O=4M}m.37(10);m.2G(u(){m.3f("5n");m.2f(80);m.3M();m.1F.2k(0.8);m.1F.2g(50);o m.1F.2N(10)});m.2G(u(){m.3f("9U");m.2f(80);o m.4j("#dA")});m.2N(20);m.2k(0.8);B(1O){o m.1O("45%",20)}});P.G.M("dB",u(){m.2k(1.2);m.2G(u(){m.3f("6G");m.2f(60);m.3M();m.1F.3l({31:5});o m.1F.52(15)});m.2G(u(){m.3f("9S");m.2f(40);o m.4j("#dC")});m.2G(u(){m.3f("5n");m.2f(35);m.3M();m.1F.37(40);m.1F.3F(40);m.1F.2N(30);m.1F.2g(15);m.1F.2c(\'r\',[0,40],[1e,1e],[1e,1e],[C,8z]);m.1F.2c(\'g\',[0,40],[1e,1e],[1e,1e],[C,8z]);m.1F.2c(\'b\',[0,40],[1e,1e],[1e,1e],[C,8z]);o m.1F.52(5)});m.2c(\'r\',[20,0],[1e,dE],[1e,1e],[6J,C]);m.2c(\'g\',[20,0],[1e,1e],[1e,1e],[6J,C]);m.2c(\'b\',[20,0],[1e,7R],[1e,1e],[6J,C]);o m.1O("45%",20)});P.G.M("dG",u(){m.37(40);m.3X("#9C",10);m.2c(\'b\',[0,10],[1e,4L],[88,88],[C,C]);m.2G(u(){m.3f(\'6G\');m.2f(50);m.3M();m.1F.2k(0.7);o m.2G(u(){m.3f(\'8q\');m.2f(60);o m.4j(\'#9C\')})});m.2G(u(){m.3f(\'5n\');m.2f(60);m.3M();m.1F.3u(50);m.1F.8h(90);o m.1F.2g(10)});m.2k(1.4);m.3F(-30);m.2G(u(){m.2f(10);o m.4j(\'#dI\')});o m});P.G.M("dJ",u(){m.3u(20);m.2k(1.4);m.4d();m.2g(5);m.3Z(1h);m.3l({31:8,3D:2,4u:4});m.2k(0.8);m.2g(5);m.2N(10);m.2G(u(){m.3f(\'6G\');m.3M();m.2f(55);o m.1F.52(10)});o m.1O("50%",30)});P.G.M("dK",u(){m.4d();m.2g(10);m.2k(0.9);m.2G(u(){m.3f("5n");m.2f(40);m.3M();m.1F.2N(15);m.1F.2g(15);o m.1F.3l({4u:10,31:5})});m.3Z(30);m.2c(\'2u\',[0,10],[7e,90],[4L,5h],[6J,C]);m.3l({31:5,4u:-2});o m.2N(15)});P.G.M("dL",u(){m.6h(40);m.3u(-50);m.3l({31:3});m.2G(u(){m.3f("5n");m.2f(80);m.3M();m.1F.6h(5);m.1F.2g(50);m.1F.2N(10);o m.1F.3l({3D:5})});o m.37(10)});P.2b.M("8a",u(E,F,x,y){I K,54;B(x==N){x=0}B(y==N){y=0}B(1A 2x!=="4s"&&2x!==N){K=1U 2S(E,F)}R{K=2o.41(\'K\');K.E=E;K.F=F}54=K.4w(\'2d\');54.5Y(m.K,x,y,E,F,0,0,E,F);o m.81(K)});P.2b.M("7v",u(2n){I K,54;B(2n==N){2n=N}B(2n===N||(!(2n.E!=N)&&!(2n.F!=N))){2O.at("dQ dR dS 1c dT 1d 7v");o}B(!(2n.E!=N)){2n.E=m.K.E*2n.F/m.K.F}R B(!(2n.F!=N)){2n.F=m.K.F*2n.E/m.K.E}B(1A 2x!=="4s"&&2x!==N){K=1U 2S(2n.E,2n.F)}R{K=2o.41(\'K\');K.E=2n.E;K.F=2n.F}54=K.4w(\'2d\');54.5Y(m.K,0,0,m.K.E,m.K.F,0,0,2n.E,2n.F);o m.81(K)});P.G.M("8a",u(E,F,x,y){B(x==N){x=0}B(y==N){y=0}o m.51("8a",7Z.1b.4Z.2K(1l,0))});P.G.M("7v",u(E,F){o m.51("7v",7Z.1b.4Z.2K(1l,0))});(u(){I 4v,5g,5j;5g=[2F,2F,2M,2F,3a,2M,39,2F,3I,3a,3o,2M,3J,39,3K,2F,49,3I,47,3a,4o,3o,4k,2M,4b,3J,4a,39,2W,3K,4f,2F,5m,49,3H,3I,5o,47,5p,3a,2W,4o,5q,3o,44,4k,4i,2M,5s,4b,5t,3J,5u,4a,5v,39,5x,2W,5z,3K,5B,4f,3v,2F,6U,5m,6T,49,6S,3H,6R,3I,6P,5o,6O,47,4n,5p,6N,3a,5E,2W,6M,4o,6L,5q,4x,3o,3v,44,6H,4k,6F,4i,6E,2M,6C,5s,3H,4b,6B,5t,6z,3J,6y,5u,6x,4a,4n,5v,5G,39,6v,5x,6u,2W,6r,5z,6q,3K,58,5B,4x,4f,6p,3v,6o,2F,az,6U,aA,5m,4i,6T,aB,49,aC,6S,aD,3H,aE,6R,aF,3I,aG,6P,aH,5o,aI,6O,aJ,47,aK,4n,6n,5p,5G,6N,6l,3a,aN,5E,aO,2W,aP,6M,aQ,4o,6k,6L,58,5q,aS,4x,aT,3o,aU,3v,aV,44,aW,6H,aX,4k,aY,6F,aZ,4i,b0,6E,b1,2M,b2,6C,b3,5s,b4,3H,b5,4b,9r,6B,9g,5t,98,6z,96,3J,8Y,6y,8X,5u,8V,6x,8U,4a,8T,4n,6n,5v,8S,5G,8O,39,6l,6v,8N,5x,5E,6u,aM,2W,ao,6r,am,5z,al,6q,6k,3K,ak,58,aj,5B,ai,4x,ah,4f,3o,6p,ag,3v,af,6o,44];5j=[9,11,12,13,13,14,14,15,15,15,15,16,16,16,16,17,17,17,17,17,17,17,18,18,18,18,18,18,18,18,18,19,19,19,19,19,19,19,19,19,19,19,19,19,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24];4v=u(){m.r=0;m.g=0;m.b=0;m.a=0;o m.1L=N};P.2b.M("52",u(1P){I 28,2r,1I,2w,2a,2p,1G,F,3B,i,2D,p,1x,1w,U,1z,2e,2m,1J,W,2Q,2z,Y,3N,1i,1B,2A,2B,7k,E,3m,x,y,1g,48,46,H,1p,1q,2s,3g,3h,3i,3j,3k;B(dU(1P)||1P<1){o}1P|=0;U=m.Z;E=m.1c.E;F=m.1c.F;2w=1P+1P+1;7k=E<<2;3m=E-1;3B=F-1;W=1P+1;2B=W*(W+1)/2;2A=1U 4v();Y=2A;1d(i=H=1;1<=2w?H<2w:H>2w;i=1<=2w?++H:--H){Y=Y.1L=1U 4v();B(i===W){3N=Y}}Y.1L=2A;1i=N;1B=N;46=1g=0;2D=5g[1P];2z=5j[1P];1d(y=1p=0;0<=F?1p<F:1p>F;y=0<=F?++1p:--1p){2e=2a=28=1J=1G=1I=0;2m=W*(1z=U[1g]);2p=W*(1w=U[1g+1]);2r=W*(1x=U[1g+2]);1J+=2B*1z;1G+=2B*1w;1I+=2B*1x;Y=2A;1d(i=1q=0;0<=W?1q<W:1q>W;i=0<=W?++1q:--1q){Y.r=1z;Y.g=1w;Y.b=1x;Y=Y.1L}1d(i=2s=1;1<=W?2s<W:2s>W;i=1<=W?++2s:--2s){p=1g+((3m<i?3m:i)<<2);1J+=(Y.r=(1z=U[p]))*(2Q=W-i);1G+=(Y.g=(1w=U[p+1]))*2Q;1I+=(Y.b=(1x=U[p+2]))*2Q;2e+=1z;2a+=1w;28+=1x;Y=Y.1L}1i=2A;1B=3N;1d(x=3g=0;0<=E?3g<E:3g>E;x=0<=E?++3g:--3g){U[1g]=(1J*2D)>>2z;U[1g+1]=(1G*2D)>>2z;U[1g+2]=(1I*2D)>>2z;1J-=2m;1G-=2p;1I-=2r;2m-=1i.r;2p-=1i.g;2r-=1i.b;p=(46+((p=x+1P+1)<3m?p:3m))<<2;2e+=(1i.r=U[p]);2a+=(1i.g=U[p+1]);28+=(1i.b=U[p+2]);1J+=2e;1G+=2a;1I+=28;1i=1i.1L;2m+=(1z=1B.r);2p+=(1w=1B.g);2r+=(1x=1B.b);2e-=1z;2a-=1w;28-=1x;1B=1B.1L;1g+=4}46+=E}1d(x=3h=0;0<=E?3h<E:3h>E;x=0<=E?++3h:--3h){2a=28=2e=1G=1I=1J=0;1g=x<<2;2m=W*(1z=U[1g]);2p=W*(1w=U[1g+1]);2r=W*(1x=U[1g+2]);1J+=2B*1z;1G+=2B*1w;1I+=2B*1x;Y=2A;1d(i=3i=0;0<=W?3i<W:3i>W;i=0<=W?++3i:--3i){Y.r=1z;Y.g=1w;Y.b=1x;Y=Y.1L}48=E;1d(i=3j=1;1<=1P?3j<=1P:3j>=1P;i=1<=1P?++3j:--3j){1g=(48+x)<<2;1J+=(Y.r=(1z=U[1g]))*(2Q=W-i);1G+=(Y.g=(1w=U[1g+1]))*2Q;1I+=(Y.b=(1x=U[1g+2]))*2Q;2e+=1z;2a+=1w;28+=1x;Y=Y.1L;B(i<3B){48+=E}}1g=x;1i=2A;1B=3N;1d(y=3k=0;0<=F?3k<F:3k>F;y=0<=F?++3k:--3k){p=1g<<2;U[p]=(1J*2D)>>2z;U[p+1]=(1G*2D)>>2z;U[p+2]=(1I*2D)>>2z;1J-=2m;1G-=2p;1I-=2r;2m-=1i.r;2p-=1i.g;2r-=1i.b;p=(x+(((p=y+W)<3B?p:3B)*E))<<2;1J+=(2e+=(1i.r=U[p]));1G+=(2a+=(1i.g=U[p+1]));1I+=(28+=(1i.b=U[p+2]));1i=1i.1L;2m+=(1z=1B.r);2p+=(1w=1B.g);2r+=(1x=1B.b);2e-=1z;2a-=1w;28-=1x;1B=1B.1L;1g+=E}}o m});o P.G.M("52",u(1P){o m.51("52",[1P])})})();P.G.M("a3",u(J){o m.29("a3",u(A){I 7g;7g=(0.9m*A.r)+(0.9q*A.g)+(0.9s*A.b);B(7g<J){A.r=0;A.g=0;A.b=0}R{A.r=C;A.g=C;A.b=C}o A})})}).2K(m);',62,864,'||||||||||||||||||||||this||return||||||function||||||rgba|if|255|opts|width|height|Filter|_i|var|adjust|canvas|Math|register|null|rgbaParent|Caman|loc|else|image|_ref|pixels|rgbaLayer|radiusPlus1|id|stack|pixelData|||||||||||name|prototype|dimensions|for|128|max|yi|100|stackIn|type|amt|arguments|length|size|CamanInstance|_j|_k|callback|end|corners|Util|options|pg|pb|_this|pr|typeof|stackOut|context|result|pow|filter|g_sum|start|b_sum|r_sum|job|next|case|bezier|vignette|radius|Type|Convert|coords|img|new|src|RenderJob|Blender|IO|Store|||||||layer||b_in_sum|process|g_in_sum|Plugin|curves||r_in_sum|opacity|contrast|gradient|min|data|gamma|idx|r_out_sum|newDims|document|g_out_sum|args|b_out_sum|_l|kernel|rgb|cornerRadius|div|exports|element|shg_sum|stackStart|sumFactor|val|mul_sum|builder|512|newLayer|parentData|Calculate|Event|call|_len|456|exposure|Log|Layer|rbs|divisor|Canvas|newLoc|break|push|312|_results|color|PixelInfo||red|strength|res|center|||brightness|055|335|328|imagePixels|url|floor|processKernel|setBlendingMode|_m|_n|_o|_p|_q|channels|widthMinus1|levels|271|object|parseInt|bias|clampRGB|target|saturation|265|iradius|cnv|file|ctrl2|ctrl1|heightMinus1|get|blue|debug|vibrance|false|428|405|388|292|_ref1|copyParent|stackEnd|x1|bnum|renderQueue|rand|radialDist|maxDist|y1|execute|defaults|colorize|apply|sepia||createElement|plugin|imageData|259||yw|364|yp|454|360|420|proxyURL|greyscale|string|273|y2|x2|475|fillColor|496|avg|Analyze|354|298|abs|toLowerCase|pixelInfo|undefined|degrees|green|BlurStack|getContext|278|angle|modPixelData|layerData|events|search|addColorStop|hex|Image|switch|bottom|distance|substr|lang|180|true|steps|newHeight|left|hsv|Logger|curveY|chans|instance|_r|fs|finishedFn|chan|slice||processPlugin|stackBlur|getImageData|ctx||wh4|level|287||imageLoaded|dim|blend|extend|right|top|mul_table|200|1379310345|shg_table|uniqid|_ref2|482|multiply|383|345|284|items|437|404|374|347|builderIndex|323|throw|302|Blocks|282|centerX|centerY|320|leftCoord|341|prop|radius2|radius1|oldCanvas|y0|newWidth|pixelStack|lookupValue|Blur|x0|attr|onload|iblend|getFloat|Cx|currentLayer|pixel|drawImage|numOfValues||event|currentIndex|complete|copy|adjustSize|numOfAreas||Cy|256|rj|fn|renderDone|blockN|finishInit|nodeName|processNext|sharpen|numPixels|finished|294|332|loadCanvas|350|261|269|297|307|vert|horiz|318|329|By|367|381|396|proxyUrl|412|446|white|465|485|overlay|507|remoteProxy|235|rightCoord|291|305|337|373|394|blurLevels|417|441|468|497|hexToRGB|overwrite|void|remoteCheck|Bx||index|getAttribute|noise|clip||has|parentNode|grey|langToExt|canvasID|canvasLoaded|highBound|lowBound|120|hueToRGB|luminance|matches|round|oldHeight|w4|radiusFactor|oldWidth|startRadius|continue|processFn|wh|sel|dist|dest|root|resize|percent|obj|trigger|Root|Node|Single|_fn|Kernel|blenders|method|xyz|1284185493|getLinearGradientMap|getRadialGradientMap|2068965517|787037037|LayerDequeue|blocksDone|3333333333|LoadOverlay|008856451679|108|whiteZ|whiteY|whiteX|4166666667|0031308|in|sqrt|Array||replaceCanvas|__hasProp|posterize|04045|isRemote|vignetteFilters||190|info|crop|radiusPixels|_type|Ax|Ay|value|toBase64|hue|Unknown|stats|version|compoundBlur|y3|DOMContentLoaded|x3|blendingMode|normal|toString|addEventListener|layerStack|black|of|find|canvasQueue|not|215|Could|locationXY|loadImage|plugins|blockFinished|curveX|readyState|loadUnknown|blockPixelLength|lastBlockN|LayerFinished|cos|reverse|326|338|nowLoc|radialBlur|Radial|344|357|363|370|to|377|385|newCanvas||remote||randomRange|270||392|144|400|proxy|DEBUG|loadOverlay|executePlugin|types|executeFilter|processStart|408|processComplete|renderFinished|__indexOf|rectangularVignette|loadNode|2126|mirrored|renderBlock|renderKernel|7152|416|0722|Edge|140|release|focusWidth|1000|camanwidth|camanheight|while|e87b22|ea1c5d|nodeSave|browserSave|png|filterFunc|150|err|230|caman|ready|replaceChild|delete|xyzToLab|func|date|require|addition|047|softLight|increaseFactor|item|radiusData|883|rgbToHSV|shift|fillRect|fillStyle|threshold|hsvToRGB|executeLayer|pushContext|popContext|pop|applyCurrentLayer|mode|applyToParent|domainRegex|invert|Given|263|267|275|280|285|289|299|304||310|charAt|116|log|sin|error|console|500|rgbToXYZ|getPixelRelative|ID|505|489|461|447|435|422|411|399|389|378|368|359|put|315|324|316|309|301|isn|281|274|268|262|257|501|491|480|470|460|451|442|433|424|putImageData|number|Sharpen|Motion|motionBlur|Gaussian|gaussianBlur|Heavy|heavyRadialBlur|Box|boxBlur|split|869|534|272|168|314|349|189|769|607|01|darken|lighten|exclusion|difference|screen|flush|Block|Rendering|End|Start|BLOCK|Executing|setTimeout|putPixel|getPixel|putPixelRelative|warn|createLinearGradient|overlayImage|createImageData|layerID|toDataURL|toImage|writing|Finished|createRadialGradient|toBuffer|writeFile|output|Creating|catch|isFile|statSync|try|href|location|stream|octet|replace|save|caman_proxy|proxies|js|javascript|pl||perl|py|python|rb|ruby|useProxy|encodeURIComponent|camanProxyUrl|images|loading|use|Cannot|URL|configured|without|load|Attempting|domain|match|https|http|revert|render|listen|labToRGB|rgbToLab|labToXYZ|0570|2040|0557|0415|8758|9689|4986|0xff|5372|tiltShift|2406|xyzToRGB|9505|1192|PI|edgeEnhance|0193|Enhance|edgeDetect|Detect|emboss|Emboss|1805|3576|4124|vintage|hslToRGB|lomo|155|clarity|rgbToHSL|130|06|220|250|sinCity|sunrise|toFixed|crossProcess|orangePeel|random|ff9000|love|c42007|grungy|jarques|calculateLevels|onerror|186|realpathSync|setAttribute|138|115|105|148|248|pinhole|oldBoot|glowingSun|f49600|hazyDays|6899ba|analyze|158|Released|herMajesty|Version|e5f0ff|nostalgia|hemingway|concentrate|window|hasOwnProperty|querySelector|indexOf|Invalid|or|missing|given|isNaN|default'.split('|'),0,{}))
/*
 * Javascript EXIF Reader 0.1.4
 * Copyright (c) 2008 Jacob Seidelin, cupboy@gmail.com, http://blog.nihilogic.dk/
 * Licensed under the MPL License [http://www.nihilogic.dk/licenses/mpl-license.txt]
 */


var EXIF = {};

(function() {

var bDebug = false;

EXIF.Tags = {

	// version tags
	0x9000 : "ExifVersion",			// EXIF version
	0xA000 : "FlashpixVersion",		// Flashpix format version

	// colorspace tags
	0xA001 : "ColorSpace",			// Color space information tag

	// image configuration
	0xA002 : "PixelXDimension",		// Valid width of meaningful image
	0xA003 : "PixelYDimension",		// Valid height of meaningful image
	0x9101 : "ComponentsConfiguration",	// Information about channels
	0x9102 : "CompressedBitsPerPixel",	// Compressed bits per pixel

	// user information
	0x927C : "MakerNote",			// Any desired information written by the manufacturer
	0x9286 : "UserComment",			// Comments by user

	// related file
	0xA004 : "RelatedSoundFile",		// Name of related sound file

	// date and time
	0x9003 : "DateTimeOriginal",		// Date and time when the original image was generated
	0x9004 : "DateTimeDigitized",		// Date and time when the image was stored digitally
	0x9290 : "SubsecTime",			// Fractions of seconds for DateTime
	0x9291 : "SubsecTimeOriginal",		// Fractions of seconds for DateTimeOriginal
	0x9292 : "SubsecTimeDigitized",		// Fractions of seconds for DateTimeDigitized

	// picture-taking conditions
	0x829A : "ExposureTime",		// Exposure time (in seconds)
	0x829D : "FNumber",			// F number
	0x8822 : "ExposureProgram",		// Exposure program
	0x8824 : "SpectralSensitivity",		// Spectral sensitivity
	0x8827 : "ISOSpeedRatings",		// ISO speed rating
	0x8828 : "OECF",			// Optoelectric conversion factor
	0x9201 : "ShutterSpeedValue",		// Shutter speed
	0x9202 : "ApertureValue",		// Lens aperture
	0x9203 : "BrightnessValue",		// Value of brightness
	0x9204 : "ExposureBias",		// Exposure bias
	0x9205 : "MaxApertureValue",		// Smallest F number of lens
	0x9206 : "SubjectDistance",		// Distance to subject in meters
	0x9207 : "MeteringMode", 		// Metering mode
	0x9208 : "LightSource",			// Kind of light source
	0x9209 : "Flash",			// Flash status
	0x9214 : "SubjectArea",			// Location and area of main subject
	0x920A : "FocalLength",			// Focal length of the lens in mm
	0xA20B : "FlashEnergy",			// Strobe energy in BCPS
	0xA20C : "SpatialFrequencyResponse",	// 
	0xA20E : "FocalPlaneXResolution", 	// Number of pixels in width direction per FocalPlaneResolutionUnit
	0xA20F : "FocalPlaneYResolution", 	// Number of pixels in height direction per FocalPlaneResolutionUnit
	0xA210 : "FocalPlaneResolutionUnit", 	// Unit for measuring FocalPlaneXResolution and FocalPlaneYResolution
	0xA214 : "SubjectLocation",		// Location of subject in image
	0xA215 : "ExposureIndex",		// Exposure index selected on camera
	0xA217 : "SensingMethod", 		// Image sensor type
	0xA300 : "FileSource", 			// Image source (3 == DSC)
	0xA301 : "SceneType", 			// Scene type (1 == directly photographed)
	0xA302 : "CFAPattern",			// Color filter array geometric pattern
	0xA401 : "CustomRendered",		// Special processing
	0xA402 : "ExposureMode",		// Exposure mode
	0xA403 : "WhiteBalance",		// 1 = auto white balance, 2 = manual
	0xA404 : "DigitalZoomRation",		// Digital zoom ratio
	0xA405 : "FocalLengthIn35mmFilm",	// Equivalent foacl length assuming 35mm film camera (in mm)
	0xA406 : "SceneCaptureType",		// Type of scene
	0xA407 : "GainControl",			// Degree of overall image gain adjustment
	0xA408 : "Contrast",			// Direction of contrast processing applied by camera
	0xA409 : "Saturation", 			// Direction of saturation processing applied by camera
	0xA40A : "Sharpness",			// Direction of sharpness processing applied by camera
	0xA40B : "DeviceSettingDescription",	// 
	0xA40C : "SubjectDistanceRange",	// Distance to subject

	// other tags
	0xA005 : "InteroperabilityIFDPointer",
	0xA420 : "ImageUniqueID"		// Identifier assigned uniquely to each image
};

EXIF.TiffTags = {
	0x0100 : "ImageWidth",
	0x0101 : "ImageHeight",
	0x8769 : "ExifIFDPointer",
	0x8825 : "GPSInfoIFDPointer",
	0xA005 : "InteroperabilityIFDPointer",
	0x0102 : "BitsPerSample",
	0x0103 : "Compression",
	0x0106 : "PhotometricInterpretation",
	0x0112 : "Orientation",
	0x0115 : "SamplesPerPixel",
	0x011C : "PlanarConfiguration",
	0x0212 : "YCbCrSubSampling",
	0x0213 : "YCbCrPositioning",
	0x011A : "XResolution",
	0x011B : "YResolution",
	0x0128 : "ResolutionUnit",
	0x0111 : "StripOffsets",
	0x0116 : "RowsPerStrip",
	0x0117 : "StripByteCounts",
	0x0201 : "JPEGInterchangeFormat",
	0x0202 : "JPEGInterchangeFormatLength",
	0x012D : "TransferFunction",
	0x013E : "WhitePoint",
	0x013F : "PrimaryChromaticities",
	0x0211 : "YCbCrCoefficients",
	0x0214 : "ReferenceBlackWhite",
	0x0132 : "DateTime",
	0x010E : "ImageDescription",
	0x010F : "Make",
	0x0110 : "Model",
	0x0131 : "Software",
	0x013B : "Artist",
	0x8298 : "Copyright"
}

EXIF.GPSTags = {
	0x0000 : "GPSVersionID",
	0x0001 : "GPSLatitudeRef",
	0x0002 : "GPSLatitude",
	0x0003 : "GPSLongitudeRef",
	0x0004 : "GPSLongitude",
	0x0005 : "GPSAltitudeRef",
	0x0006 : "GPSAltitude",
	0x0007 : "GPSTimeStamp",
	0x0008 : "GPSSatellites",
	0x0009 : "GPSStatus",
	0x000A : "GPSMeasureMode",
	0x000B : "GPSDOP",
	0x000C : "GPSSpeedRef",
	0x000D : "GPSSpeed",
	0x000E : "GPSTrackRef",
	0x000F : "GPSTrack",
	0x0010 : "GPSImgDirectionRef",
	0x0011 : "GPSImgDirection",
	0x0012 : "GPSMapDatum",
	0x0013 : "GPSDestLatitudeRef",
	0x0014 : "GPSDestLatitude",
	0x0015 : "GPSDestLongitudeRef",
	0x0016 : "GPSDestLongitude",
	0x0017 : "GPSDestBearingRef",
	0x0018 : "GPSDestBearing",
	0x0019 : "GPSDestDistanceRef",
	0x001A : "GPSDestDistance",
	0x001B : "GPSProcessingMethod",
	0x001C : "GPSAreaInformation",
	0x001D : "GPSDateStamp",
	0x001E : "GPSDifferential"
}

EXIF.StringValues = {
	ExposureProgram : {
		0 : "Not defined",
		1 : "Manual",
		2 : "Normal program",
		3 : "Aperture priority",
		4 : "Shutter priority",
		5 : "Creative program",
		6 : "Action program",
		7 : "Portrait mode",
		8 : "Landscape mode"
	},
	MeteringMode : {
		0 : "Unknown",
		1 : "Average",
		2 : "CenterWeightedAverage",
		3 : "Spot",
		4 : "MultiSpot",
		5 : "Pattern",
		6 : "Partial",
		255 : "Other"
	},
	LightSource : {
		0 : "Unknown",
		1 : "Daylight",
		2 : "Fluorescent",
		3 : "Tungsten (incandescent light)",
		4 : "Flash",
		9 : "Fine weather",
		10 : "Cloudy weather",
		11 : "Shade",
		12 : "Daylight fluorescent (D 5700 - 7100K)",
		13 : "Day white fluorescent (N 4600 - 5400K)",
		14 : "Cool white fluorescent (W 3900 - 4500K)",
		15 : "White fluorescent (WW 3200 - 3700K)",
		17 : "Standard light A",
		18 : "Standard light B",
		19 : "Standard light C",
		20 : "D55",
		21 : "D65",
		22 : "D75",
		23 : "D50",
		24 : "ISO studio tungsten",
		255 : "Other"
	},
	Flash : {
		0x0000 : "Flash did not fire",
		0x0001 : "Flash fired",
		0x0005 : "Strobe return light not detected",
		0x0007 : "Strobe return light detected",
		0x0009 : "Flash fired, compulsory flash mode",
		0x000D : "Flash fired, compulsory flash mode, return light not detected",
		0x000F : "Flash fired, compulsory flash mode, return light detected",
		0x0010 : "Flash did not fire, compulsory flash mode",
		0x0018 : "Flash did not fire, auto mode",
		0x0019 : "Flash fired, auto mode",
		0x001D : "Flash fired, auto mode, return light not detected",
		0x001F : "Flash fired, auto mode, return light detected",
		0x0020 : "No flash function",
		0x0041 : "Flash fired, red-eye reduction mode",
		0x0045 : "Flash fired, red-eye reduction mode, return light not detected",
		0x0047 : "Flash fired, red-eye reduction mode, return light detected",
		0x0049 : "Flash fired, compulsory flash mode, red-eye reduction mode",
		0x004D : "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",
		0x004F : "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",
		0x0059 : "Flash fired, auto mode, red-eye reduction mode",
		0x005D : "Flash fired, auto mode, return light not detected, red-eye reduction mode",
		0x005F : "Flash fired, auto mode, return light detected, red-eye reduction mode"
	},
	SensingMethod : {
		1 : "Not defined",
		2 : "One-chip color area sensor",
		3 : "Two-chip color area sensor",
		4 : "Three-chip color area sensor",
		5 : "Color sequential area sensor",
		7 : "Trilinear sensor",
		8 : "Color sequential linear sensor"
	},
	SceneCaptureType : {
		0 : "Standard",
		1 : "Landscape",
		2 : "Portrait",
		3 : "Night scene"
	},
	SceneType : {
		1 : "Directly photographed"
	},
	CustomRendered : {
		0 : "Normal process",
		1 : "Custom process"
	},
	WhiteBalance : {
		0 : "Auto white balance",
		1 : "Manual white balance"
	},
	GainControl : {
		0 : "None",
		1 : "Low gain up",
		2 : "High gain up",
		3 : "Low gain down",
		4 : "High gain down"
	},
	Contrast : {
		0 : "Normal",
		1 : "Soft",
		2 : "Hard"
	},
	Saturation : {
		0 : "Normal",
		1 : "Low saturation",
		2 : "High saturation"
	},
	Sharpness : {
		0 : "Normal",
		1 : "Soft",
		2 : "Hard"
	},
	SubjectDistanceRange : {
		0 : "Unknown",
		1 : "Macro",
		2 : "Close view",
		3 : "Distant view"
	},
	FileSource : {
		3 : "DSC"
	},

	Components : {
		0 : "",
		1 : "Y",
		2 : "Cb",
		3 : "Cr",
		4 : "R",
		5 : "G",
		6 : "B"
	}
}

function addEvent(oElement, strEvent, fncHandler) 
{
	if (oElement.addEventListener) { 
		oElement.addEventListener(strEvent, fncHandler, false); 
	} else if (oElement.attachEvent) { 
		oElement.attachEvent("on" + strEvent, fncHandler); 
	}
}


function imageHasData(oImg) 
{
	return !!(oImg.exifdata);
}

function getImageData(oImg, fncCallback) 
{
	BinaryAjax(
		oImg.src,
		function(oHTTP) {
			var oEXIF = findEXIFinJPEG(oHTTP.binaryResponse);
			oImg.exifdata = oEXIF || {};
			if (fncCallback) fncCallback();
		}
	)
}

function findEXIFinJPEG(oFile) {
	var aMarkers = [];

	if (oFile.getByteAt(0) != 0xFF || oFile.getByteAt(1) != 0xD8) {
		return false; // not a valid jpeg
	}

	var iOffset = 2;
	var iLength = oFile.getLength();
	while (iOffset < iLength) {
		if (oFile.getByteAt(iOffset) != 0xFF) {
			if (bDebug) console.log("Not a valid marker at offset " + iOffset + ", found: " + oFile.getByteAt(iOffset));
			return false; // not a valid marker, something is wrong
		}

		var iMarker = oFile.getByteAt(iOffset+1);

		// we could implement handling for other markers here, 
		// but we're only looking for 0xFFE1 for EXIF data

		if (iMarker == 22400) {
			if (bDebug) console.log("Found 0xFFE1 marker");
			return readEXIFData(oFile, iOffset + 4, oFile.getShortAt(iOffset+2, true)-2);
			iOffset += 2 + oFile.getShortAt(iOffset+2, true);

		} else if (iMarker == 225) {
			// 0xE1 = Application-specific 1 (for EXIF)
			if (bDebug) console.log("Found 0xFFE1 marker");
			return readEXIFData(oFile, iOffset + 4, oFile.getShortAt(iOffset+2, true)-2);

		} else {
			iOffset += 2 + oFile.getShortAt(iOffset+2, true);
		}

	}

}


function readTags(oFile, iTIFFStart, iDirStart, oStrings, bBigEnd) 
{
	var iEntries = oFile.getShortAt(iDirStart, bBigEnd);
	var oTags = {};
	for (var i=0;i<iEntries;i++) {
		var iEntryOffset = iDirStart + i*12 + 2;
		var strTag = oStrings[oFile.getShortAt(iEntryOffset, bBigEnd)];
		if (!strTag && bDebug) console.log("Unknown tag: " + oFile.getShortAt(iEntryOffset, bBigEnd));
		oTags[strTag] = readTagValue(oFile, iEntryOffset, iTIFFStart, iDirStart, bBigEnd);
	}
	return oTags;
}


function readTagValue(oFile, iEntryOffset, iTIFFStart, iDirStart, bBigEnd)
{
	var iType = oFile.getShortAt(iEntryOffset+2, bBigEnd);
	var iNumValues = oFile.getLongAt(iEntryOffset+4, bBigEnd);
	var iValueOffset = oFile.getLongAt(iEntryOffset+8, bBigEnd) + iTIFFStart;

	switch (iType) {
		case 1: // byte, 8-bit unsigned int
		case 7: // undefined, 8-bit byte, value depending on field
			if (iNumValues == 1) {
				return oFile.getByteAt(iEntryOffset + 8, bBigEnd);
			} else {
				var iValOffset = iNumValues > 4 ? iValueOffset : (iEntryOffset + 8);
				var aVals = [];
				for (var n=0;n<iNumValues;n++) {
					aVals[n] = oFile.getByteAt(iValOffset + n);
				}
				return aVals;
			}
			break;

		case 2: // ascii, 8-bit byte
			var iStringOffset = iNumValues > 4 ? iValueOffset : (iEntryOffset + 8);
			return oFile.getStringAt(iStringOffset, iNumValues-1);
			break;

		case 3: // short, 16 bit int
			if (iNumValues == 1) {
				return oFile.getShortAt(iEntryOffset + 8, bBigEnd);
			} else {
				var iValOffset = iNumValues > 2 ? iValueOffset : (iEntryOffset + 8);
				var aVals = [];
				for (var n=0;n<iNumValues;n++) {
					aVals[n] = oFile.getShortAt(iValOffset + 2*n, bBigEnd);
				}
				return aVals;
			}
			break;

		case 4: // long, 32 bit int
			if (iNumValues == 1) {
				return oFile.getLongAt(iEntryOffset + 8, bBigEnd);
			} else {
				var aVals = [];
				for (var n=0;n<iNumValues;n++) {
					aVals[n] = oFile.getLongAt(iValueOffset + 4*n, bBigEnd);
				}
				return aVals;
			}
			break;
		case 5:	// rational = two long values, first is numerator, second is denominator
			if (iNumValues == 1) {
				return oFile.getLongAt(iValueOffset, bBigEnd) / oFile.getLongAt(iValueOffset+4, bBigEnd);
			} else {
				var aVals = [];
				for (var n=0;n<iNumValues;n++) {
					aVals[n] = oFile.getLongAt(iValueOffset + 8*n, bBigEnd) / oFile.getLongAt(iValueOffset+4 + 8*n, bBigEnd);
				}
				return aVals;
			}
			break;
		case 9: // slong, 32 bit signed int
			if (iNumValues == 1) {
				return oFile.getSLongAt(iEntryOffset + 8, bBigEnd);
			} else {
				var aVals = [];
				for (var n=0;n<iNumValues;n++) {
					aVals[n] = oFile.getSLongAt(iValueOffset + 4*n, bBigEnd);
				}
				return aVals;
			}
			break;
		case 10: // signed rational, two slongs, first is numerator, second is denominator
			if (iNumValues == 1) {
				return oFile.getSLongAt(iValueOffset, bBigEnd) / oFile.getSLongAt(iValueOffset+4, bBigEnd);
			} else {
				var aVals = [];
				for (var n=0;n<iNumValues;n++) {
					aVals[n] = oFile.getSLongAt(iValueOffset + 8*n, bBigEnd) / oFile.getSLongAt(iValueOffset+4 + 8*n, bBigEnd);
				}
				return aVals;
			}
			break;
	}
}


function readEXIFData(oFile, iStart, iLength) 
{
	if (oFile.getStringAt(iStart, 4) != "Exif") {
		if (bDebug) console.log("Not valid EXIF data! " + oFile.getStringAt(iStart, 4));
		return false;
	}

	var bBigEnd;

	var iTIFFOffset = iStart + 6;

	// test for TIFF validity and endianness
	if (oFile.getShortAt(iTIFFOffset) == 0x4949) {
		bBigEnd = false;
	} else if (oFile.getShortAt(iTIFFOffset) == 0x4D4D) {
		bBigEnd = true;
	} else {
		if (bDebug) console.log("Not valid TIFF data! (no 0x4949 or 0x4D4D)");
		return false;
	}

	if (oFile.getShortAt(iTIFFOffset+2, bBigEnd) != 0x002A) {
		if (bDebug) console.log("Not valid TIFF data! (no 0x002A)");
		return false;
	}

	if (oFile.getLongAt(iTIFFOffset+4, bBigEnd) != 0x00000008) {
		if (bDebug) console.log("Not valid TIFF data! (First offset not 8)", oFile.getShortAt(iTIFFOffset+4, bBigEnd));
		return false;
	}

	var oTags = readTags(oFile, iTIFFOffset, iTIFFOffset+8, EXIF.TiffTags, bBigEnd);

	if (oTags.ExifIFDPointer) {
		var oEXIFTags = readTags(oFile, iTIFFOffset, iTIFFOffset + oTags.ExifIFDPointer, EXIF.Tags, bBigEnd);
		for (var strTag in oEXIFTags) {
			switch (strTag) {
				case "LightSource" :
				case "Flash" :
				case "MeteringMode" :
				case "ExposureProgram" :
				case "SensingMethod" :
				case "SceneCaptureType" :
				case "SceneType" :
				case "CustomRendered" :
				case "WhiteBalance" : 
				case "GainControl" : 
				case "Contrast" :
				case "Saturation" :
				case "Sharpness" : 
				case "SubjectDistanceRange" :
				case "FileSource" :
					oEXIFTags[strTag] = EXIF.StringValues[strTag][oEXIFTags[strTag]];
					break;
	
				case "ExifVersion" :
				case "FlashpixVersion" :
					oEXIFTags[strTag] = String.fromCharCode(oEXIFTags[strTag][0], oEXIFTags[strTag][1], oEXIFTags[strTag][2], oEXIFTags[strTag][3]);
					break;
	
				case "ComponentsConfiguration" : 
					oEXIFTags[strTag] = 
						EXIF.StringValues.Components[oEXIFTags[strTag][0]]
						+ EXIF.StringValues.Components[oEXIFTags[strTag][1]]
						+ EXIF.StringValues.Components[oEXIFTags[strTag][2]]
						+ EXIF.StringValues.Components[oEXIFTags[strTag][3]];
					break;
			}
			oTags[strTag] = oEXIFTags[strTag];
		}
	}

	if (oTags.GPSInfoIFDPointer) {
		var oGPSTags = readTags(oFile, iTIFFOffset, iTIFFOffset + oTags.GPSInfoIFDPointer, EXIF.GPSTags, bBigEnd);
		for (var strTag in oGPSTags) {
			switch (strTag) {
				case "GPSVersionID" : 
					oGPSTags[strTag] = oGPSTags[strTag][0] 
						+ "." + oGPSTags[strTag][1] 
						+ "." + oGPSTags[strTag][2] 
						+ "." + oGPSTags[strTag][3];
					break;
			}
			oTags[strTag] = oGPSTags[strTag];
		}
	}

	return oTags;
}


EXIF.getData = function(oImg, fncCallback) 
{
	if (!oImg.complete) return false;
	if (!imageHasData(oImg)) {
		getImageData(oImg, fncCallback);
	} else {
		if (fncCallback) fncCallback();
	}
	return true;
}

EXIF.getTag = function(oImg, strTag) 
{
	if (!imageHasData(oImg)) return;
	return oImg.exifdata[strTag];
}

EXIF.getAllTags = function(oImg) 
{
	if (!imageHasData(oImg)) return {};
	var oData = oImg.exifdata;
	var oAllTags = {};
	for (var a in oData) {
		if (oData.hasOwnProperty(a)) {
			oAllTags[a] = oData[a];
		}
	}
	return oAllTags;
}


EXIF.pretty = function(oImg) 
{
	if (!imageHasData(oImg)) return "";
	var oData = oImg.exifdata;
	var strPretty = "";
	for (var a in oData) {
		if (oData.hasOwnProperty(a)) {
			if (typeof oData[a] == "object") {
				strPretty += a + " : [" + oData[a].length + " values]\r\n";
			} else {
				strPretty += a + " : " + oData[a] + "\r\n";
			}
		}
	}
	return strPretty;
}

EXIF.readFromBinaryFile = function(oFile) {
	return findEXIFinJPEG(oFile);
}

function loadAllImages() 
{
	var aImages = document.getElementsByTagName("img");
	for (var i=0;i<aImages.length;i++) {
		if (aImages[i].getAttribute("exif") == "true") {
			if (!aImages[i].complete) {
				addEvent(aImages[i], "load", 
					function() {
						EXIF.getData(this);
					}
				); 
			} else {
				EXIF.getData(aImages[i]);
			}
		}
	}
}

addEvent(window, "load", loadAllImages); 

})();


/**
 * Mega pixel image rendering library for iOS6 Safari
 *
 * Fixes iOS6 Safari's image file rendering issue for large size image (over mega-pixel),
 * which causes unexpected subsampling when drawing it in canvas.
 * By using this library, you can safely render the image with proper stretching.
 *
 * Copyright (c) 2012 Shinichi Tomita <shinichi.tomita@gmail.com>
 * Released under the MIT license
 */


  /**
   * Detect subsampling in loaded image.
   * In iOS, larger images than 2M pixels may be subsampled in rendering.
   */
  function detectSubsampling(img) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (iw * ih > 1024 * 1024) { // subsampling may happen over megapixel image
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, -iw + 1, 0);
      // subsampled image becomes half smaller in rendering size.
      // check alpha channel value to confirm image is covering edge pixel or not.
      // if alpha value is 0 image is not covering, hence subsampled.
      return ctx.getImageData(0, 0, 1, 1).data[3] === 0;
    } else {
      return false;
    }
  }

  /**
   * Detecting vertical squash in loaded image.
   * Fixes a bug which squash image vertically while drawing into canvas for some images.
   */
  function detectVerticalSquash(img, iw, ih) {
    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = ih
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    var data = ctx.getImageData(0, 0, 1, ih).data;
    // search image edge pixel position in case it is squashed vertically.
    var sy = 0;
    var ey = ih;
    var py = ih;
    while (py > sy) {
      var alpha = data[(py - 1) * 4 + 3];
      if (alpha === 0) {
        ey = py;
      } else {
        sy = py;
      }
      py = (ey + sy) >> 1;
    }
    return py / ih;
  }

  /**
   * Rendering image element (with resizing) and get its data URL
   */
  function renderImageToDataURL(img, options) {
    var canvas = document.createElement('canvas');
    renderImageToCanvas(img, canvas, options);
    return canvas.toDataURL("image/jpeg", options.quality || 0.8);
  }

  /**
   * Rendering image element (with resizing) into the canvas element
   */
  function renderImageToCanvas(img, canvas, options) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var width = options.width, height = options.height;
    var ctx = canvas.getContext('2d');
    ctx.save();
    transformCoordinate(canvas, width, height, options.orientation);
    var subsampled = detectSubsampling(img);
    if (subsampled) {
      iw /= 2;
      ih /= 2;
    }
    var d = 1024; // size of tiling canvas
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = tmpCanvas.height = d;
    var tmpCtx = tmpCanvas.getContext('2d');
    var vertSquashRatio = detectVerticalSquash(img, iw, ih);
    var sy = 0;
    while (sy < ih) {
      var sh = sy + d > ih ? ih - sy : d;
      var sx = 0;
      while (sx < iw) {
        var sw = sx + d > iw ? iw - sx : d;
        tmpCtx.clearRect(0, 0, d, d);
        tmpCtx.drawImage(img, -sx, -sy);
        var dx = Math.floor(sx * width / iw);
        var dw = Math.ceil(sw * width / iw);
        var dy = Math.floor(sy * height / ih / vertSquashRatio);
        var dh = Math.ceil(sh * height / ih / vertSquashRatio);
        ctx.drawImage(tmpCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
        sx += d;
      }
      sy += d;
    }
    ctx.restore();
    tmpCanvas = tmpCtx = null;
    $(canvas).trigger('rendered');
  }

  /**
   * Transform canvas coordination according to specified frame size and orientation
   * Orientation value is from EXIF tag
   */
  function transformCoordinate(canvas, width, height, orientation) {
    console.log(width, height);
    switch (orientation) {
      case 5:
      case 6:
      case 7:
      case 8:
        canvas.width = height;
        canvas.height = width;
        break;
      default:
        canvas.width = width;
        canvas.height = height;
    }
    var ctx = canvas.getContext('2d');
    switch (orientation) {
      case 1:
        // nothing
        break;
      case 2:
        // horizontal flip
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        break;
      case 3:
        // 180 rotate left
        ctx.translate(width, height);
        ctx.rotate(Math.PI);
        break;
      case 4:
        // vertical flip
        ctx.translate(0, height);
        ctx.scale(1, -1);
        break;
      case 5:
        // vertical flip + 90 rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.scale(1, -1);
        break;
      case 6:
        // 90 rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(0, -height);
        break;
      case 7:
        // horizontal flip + 90 rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(width, -height);
        ctx.scale(-1, 1);
        break;
      case 8:
        // 90 rotate left
        ctx.rotate(-0.5 * Math.PI);
        ctx.translate(-width, 0);
        break;
      default:
        break;
    }
  }


  /**
   * MegaPixImage class
   */
  function MegaPixImage(srcImage) {
    if (srcImage instanceof Blob) {
      var img = new Image();
      img.src = (window.URL || window.webkitURL).createObjectURL(srcImage);
      srcImage = img;
    }
    if (!srcImage.naturalWidth && !srcImage.naturalHeight) {
      var _this = this;
      srcImage.onload = function() {
        var listeners = _this.imageLoadListeners;
        if (listeners) {
          _this.imageLoadListeners = null;
          for (var i=0, len=listeners.length; i<len; i++) {
            listeners[i]();
          }
        }
      };
      this.imageLoadListeners = [];
    }
    this.srcImage = srcImage;
  }

  /**
   * Rendering megapix image into specified target element
   */
  MegaPixImage.prototype.render = function(target, options) {
    if (this.imageLoadListeners) {
      var _this = this;
      this.imageLoadListeners.push(function() { _this.render(target, options) });
      return;
    }
    options = options || {}
    var imgWidth = this.srcImage.naturalWidth, imgHeight = this.srcImage.naturalHeight,
        width = options.width, height = options.height,
        maxWidth = options.maxWidth, maxHeight = options.maxHeight;
    if (width && !height) {
      height = Math.floor(imgHeight * width / imgWidth);
    } else if (height && !width) {
      width = Math.floor(imgWidth * height / imgHeight);
    } else {
      width = imgWidth;
      height = imgHeight;
    }
    if (maxWidth && width > maxWidth) {
      width = maxWidth;
      height = Math.floor(imgHeight * width / imgWidth);
    }
    if (maxHeight && height > maxHeight) {
      height = maxHeight;
      width = Math.floor(imgWidth * height / imgHeight);
    }
    var opt = { width : width, height : height }
    for (var k in options) opt[k] = options[k];

    var tagName = target.tagName.toLowerCase();
    if (tagName === 'img') {
      console.log(this.srcImage);
      target.src = renderImageToDataURL(this.srcImage, opt);
    } else if (tagName === 'canvas') {
      renderImageToCanvas(this.srcImage, target, opt);
    }
    if (typeof this.onrender === 'function') {
      this.onrender(target);
    }
  }

  /**
   * Export class to global
   */
  if (typeof define === 'function' && define.amd) {
    define([], function() { return MegaPixImage; }); // for AMD loader
  } else {
    this.MegaPixImage = MegaPixImage;
  }

//fgnass.github.com/spin.js#v1.2.6
!function(window, document, undefined) {

  /**
   * Copyright (c) 2011 Felix Gnass [fgnass at neteye dot de]
   * Licensed under the MIT license
   */

  var prefixes = ['webkit', 'Moz', 'ms', 'O'] /* Vendor prefixes */
    , animations = {} /* Animation rules keyed by their name */
    , useCssAnimations

  /**
   * Utility function to create elements. If no tag name is given,
   * a DIV is created. Optionally properties can be passed.
   */
  function createEl(tag, prop) {
    var el = document.createElement(tag || 'div')
      , n

    for(n in prop) el[n] = prop[n]
    return el
  }

  /**
   * Appends children and returns the parent.
   */
  function ins(parent /* child1, child2, ...*/) {
    for (var i=1, n=arguments.length; i<n; i++)
      parent.appendChild(arguments[i])

    return parent
  }

  /**
   * Insert a new stylesheet to hold the @keyframe or VML rules.
   */
  var sheet = function() {
    var el = createEl('style', {type : 'text/css'})
    ins(document.getElementsByTagName('head')[0], el)
    return el.sheet || el.styleSheet
  }()

  /**
   * Creates an opacity keyframe animation rule and returns its name.
   * Since most mobile Webkits have timing issues with animation-delay,
   * we create separate rules for each line/segment.
   */
  function addAnimation(alpha, trail, i, lines) {
    var name = ['opacity', trail, ~~(alpha*100), i, lines].join('-')
      , start = 0.01 + i/lines*100
      , z = Math.max(1 - (1-alpha) / trail * (100-start), alpha)
      , prefix = useCssAnimations.substring(0, useCssAnimations.indexOf('Animation')).toLowerCase()
      , pre = prefix && '-'+prefix+'-' || ''

    if (!animations[name]) {
      sheet.insertRule(
        '@' + pre + 'keyframes ' + name + '{' +
        '0%{opacity:' + z + '}' +
        start + '%{opacity:' + alpha + '}' +
        (start+0.01) + '%{opacity:1}' +
        (start+trail) % 100 + '%{opacity:' + alpha + '}' +
        '100%{opacity:' + z + '}' +
        '}', sheet.cssRules.length)

      animations[name] = 1
    }
    return name
  }

  /**
   * Tries various vendor prefixes and returns the first supported property.
   **/
  function vendor(el, prop) {
    var s = el.style
      , pp
      , i

    if(s[prop] !== undefined) return prop
    prop = prop.charAt(0).toUpperCase() + prop.slice(1)
    for(i=0; i<prefixes.length; i++) {
      pp = prefixes[i]+prop
      if(s[pp] !== undefined) return pp
    }
  }

  /**
   * Sets multiple style properties at once.
   */
  function css(el, prop) {
    for (var n in prop)
      el.style[vendor(el, n)||n] = prop[n]

    return el
  }

  /**
   * Fills in default values.
   */
  function merge(obj) {
    for (var i=1; i < arguments.length; i++) {
      var def = arguments[i]
      for (var n in def)
        if (obj[n] === undefined) obj[n] = def[n]
    }
    return obj
  }

  /**
   * Returns the absolute page-offset of the given element.
   */
  function pos(el) {
    var o = { x:el.offsetLeft, y:el.offsetTop }
    while((el = el.offsetParent))
      o.x+=el.offsetLeft, o.y+=el.offsetTop

    return o
  }

  var defaults = {
    lines: 12,            // The number of lines to draw
    length: 7,            // The length of each line
    width: 5,             // The line thickness
    radius: 10,           // The radius of the inner circle
    rotate: 0,            // Rotation offset
    corners: 1,           // Roundness (0..1)
    color: '#000',        // #rgb or #rrggbb
    speed: 1,             // Rounds per second
    trail: 100,           // Afterglow percentage
    opacity: 1/4,         // Opacity of the lines
    fps: 20,              // Frames per second when using setTimeout()
    zIndex: 2e9,          // Use a high z-index by default
    className: 'spinner', // CSS class to assign to the element
    top: 'auto',          // center vertically
    left: 'auto'          // center horizontally
  }

  /** The constructor */
  var Spinner = function Spinner(o) {
    if (!this.spin) return new Spinner(o)
    this.opts = merge(o || {}, Spinner.defaults, defaults)
  }

  Spinner.defaults = {}

  merge(Spinner.prototype, {
    spin: function(target) {
      this.stop()
      var self = this
        , o = self.opts
        , el = self.el = css(createEl(0, {className: o.className}), {position: 'relative', width: 0, zIndex: o.zIndex})
        , mid = o.radius+o.length+o.width
        , ep // element position
        , tp // target position

      if (target) {
        target.insertBefore(el, target.firstChild||null)
        tp = pos(target)
        ep = pos(el)
        css(el, {
          left: (o.left == 'auto' ? tp.x-ep.x + (target.offsetWidth >> 1) : parseInt(o.left, 10) + mid) + 'px',
          top: (o.top == 'auto' ? tp.y-ep.y + (target.offsetHeight >> 1) : parseInt(o.top, 10) + mid)  + 'px'
        })
      }

      el.setAttribute('aria-role', 'progressbar')
      self.lines(el, self.opts)

      if (!useCssAnimations) {
        // No CSS animation support, use setTimeout() instead
        var i = 0
          , fps = o.fps
          , f = fps/o.speed
          , ostep = (1-o.opacity) / (f*o.trail / 100)
          , astep = f/o.lines

        ;(function anim() {
          i++;
          for (var s=o.lines; s; s--) {
            var alpha = Math.max(1-(i+s*astep)%f * ostep, o.opacity)
            self.opacity(el, o.lines-s, alpha, o)
          }
          self.timeout = self.el && setTimeout(anim, ~~(1000/fps))
        })()
      }
      return self
    },

    stop: function() {
      var el = this.el
      if (el) {
        clearTimeout(this.timeout)
        if (el.parentNode) el.parentNode.removeChild(el)
        this.el = undefined
      }
      return this
    },

    lines: function(el, o) {
      var i = 0
        , seg

      function fill(color, shadow) {
        return css(createEl(), {
          position: 'absolute',
          width: (o.length+o.width) + 'px',
          height: o.width + 'px',
          background: color,
          boxShadow: shadow,
          transformOrigin: 'left',
          transform: 'rotate(' + ~~(360/o.lines*i+o.rotate) + 'deg) translate(' + o.radius+'px' +',0)',
          borderRadius: (o.corners * o.width>>1) + 'px'
        })
      }

      for (; i < o.lines; i++) {
        seg = css(createEl(), {
          position: 'absolute',
          top: 1+~(o.width/2) + 'px',
          transform: o.hwaccel ? 'translate3d(0,0,0)' : '',
          opacity: o.opacity,
          animation: useCssAnimations && addAnimation(o.opacity, o.trail, i, o.lines) + ' ' + 1/o.speed + 's linear infinite'
        })

        if (o.shadow) ins(seg, css(fill('#000', '0 0 4px ' + '#000'), {top: 2+'px'}))

        ins(el, ins(seg, fill(o.color, '0 0 1px rgba(0,0,0,.1)')))
      }
      return el
    },

    opacity: function(el, i, val) {
      if (i < el.childNodes.length) el.childNodes[i].style.opacity = val
    }

  })

  /////////////////////////////////////////////////////////////////////////
  // VML rendering for IE
  /////////////////////////////////////////////////////////////////////////

  /**
   * Check and init VML support
   */
  ;(function() {

    function vml(tag, attr) {
      return createEl('<' + tag + ' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">', attr)
    }

    var s = css(createEl('group'), {behavior: 'url(#default#VML)'})

    if (!vendor(s, 'transform') && s.adj) {

      // VML support detected. Insert CSS rule ...
      sheet.addRule('.spin-vml', 'behavior:url(#default#VML)')

      Spinner.prototype.lines = function(el, o) {
        var r = o.length+o.width
          , s = 2*r

        function grp() {
          return css(
            vml('group', {
              coordsize: s + ' ' + s,
              coordorigin: -r + ' ' + -r
            }),
            { width: s, height: s }
          )
        }

        var margin = -(o.width+o.length)*2 + 'px'
          , g = css(grp(), {position: 'absolute', top: margin, left: margin})
          , i

        function seg(i, dx, filter) {
          ins(g,
            ins(css(grp(), {rotation: 360 / o.lines * i + 'deg', left: ~~dx}),
              ins(css(vml('roundrect', {arcsize: o.corners}), {
                  width: r,
                  height: o.width,
                  left: o.radius,
                  top: -o.width>>1,
                  filter: filter
                }),
                vml('fill', {color: o.color, opacity: o.opacity}),
                vml('stroke', {opacity: 0}) // transparent stroke to fix color bleeding upon opacity change
              )
            )
          )
        }

        if (o.shadow)
          for (i = 1; i <= o.lines; i++)
            seg(i, -2, 'progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)')

        for (i = 1; i <= o.lines; i++) seg(i)
        return ins(el, g)
      }

      Spinner.prototype.opacity = function(el, i, val, o) {
        var c = el.firstChild
        o = o.shadow && o.lines || 0
        if (c && i+o < c.childNodes.length) {
          c = c.childNodes[i+o]; c = c && c.firstChild; c = c && c.firstChild
          if (c) c.opacity = val
        }
      }
    }
    else
      useCssAnimations = vendor(s, 'animation')
  })()

  if (typeof define == 'function' && define.amd)
    define(function() { return Spinner })
  else
    window.Spinner = Spinner

}(window, document)

