/**
 * Class for setting & getting cookies
 */
const Cookie = {

  /**
   * set - Sets cookie to some value
   *
   * @param  {string} cname  name of the cookie
   * @param  {string} cvalue value of the cookie
   * @param  {int} exdays in how many days will the cookies expire
   * @return {undefined}
   */
  set : function(cname, cvalue, exdays) {
      var d = new Date();
      d.setTime(d.getTime() + (exdays*24*60*60*1000));
      var expires = "expires="+ d.toUTCString();
      document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  },

  /**
   * get - Gets a cookie value
   *
   * @param  {string} cname name of the cookie
   * @return {string}     cookie value if cookie with that name exists, empty string otherwise
   */
  get : function (cname) {
      var name = cname + "=";
      var decodedCookie = decodeURIComponent(document.cookie);
      var ca = decodedCookie.split(';');
      for(var i = 0; i <ca.length; i++) {
          var c = ca[i];
          while (c.charAt(0) == ' ') {
              c = c.substring(1);
          }
          if (c.indexOf(name) == 0) {
              return c.substring(name.length, c.length);
          }
      }
      return "";
  }
}
