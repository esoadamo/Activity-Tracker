const Server = {
  user_data_url: function(user=online_data['account']){
    return `${online_data['server']}/data/${user}`;
  },

  push: function() {
    let params = `data=${JSON.stringify(online_data)}`;
    let request = new XMLHttpRequest();
    request.open("POST", Server.user_data_url(), true);
    request.onreadystatechange = function (aEvt) {
      if (request.readyState == 4) {
         if(request.status != 200) {
          console.error("Error loading page\n");
          console.error(request);
        }
      }
    };
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    request.send(params);
  },

  pull: function(callbackSuccess, callbackError=null) {
    let request = new XMLHttpRequest();
    request.open("GET", Server.user_data_url(), true);
    request.onreadystatechange = function (aEvt) {
      if (request.readyState == 4) {
         if(request.status == 200)
          callbackSuccess(http.responseText);
         else if (callbackError !== null)
          callbackError(request);
      }
    };
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    request.send(params);
  }
};
