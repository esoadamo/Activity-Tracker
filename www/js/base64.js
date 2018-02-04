const Base64 = {

  /**
   * encode - base64 encode UTF8 string
   *
   * @param  {string} string input string
   * @return {string}        base64 string
   */
  encode: function(string) {
    return btoa(encodeURIComponent(string).replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode(parseInt(p1, 16))
    }))
  },

  /**
   * decode - base64 decode UTF8 string
   *
   * @param  {string} string base64 string
   * @return {string}        input string
   */
  decode: function(string) {
    return decodeURIComponent(Array.prototype.map.call(atob(string), function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
  }
}
