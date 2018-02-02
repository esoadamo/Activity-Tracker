const Server = {
  user_data_url: function(user=offline_data['account']){
    return `${offline_data['server']}/data/${user}`;
  },

  push: function() {
    let online_data_curr = online_data;
    let update_dict = getDictChanges(online_data_curr, offline_data['server_data']);
    let params = `data=${JSON.stringify(online_data_curr)}`;
    let request = new XMLHttpRequest();
    request.open("POST", Server.user_data_url(), true);
    request.onreadystatechange = function (aEvt) {
      if (request.readyState == 4) {
         if(request.status == 200) {
           offline_data['server_data'] = online_data_curr;
         } else {
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
