const config = {
  'period': 30, // how long does one period lasts in minutes
  'days': 7, // how many days to paint at once
  'categories': {
    'fun': 'green',
    'friends': 'pink',
    'sleep': '#6b0067',
    'unknown': '#969696'
  },
  'saved_data': {}, // by default user does not have any data
  save: () => {
    switch (app_mode) {
      case app_mode_webpage: // webpage? save data into cookies
        document.cookie = strf("time_tracker_app=%s; expires=Fri, 22 Feb 2222 22:22:22 UTC", encodeURI(JSON.stringify(config)));
        console.log('Saved');
        break;
    }
  },
  load: () => {
    let saved_data = null;

    switch (app_mode) {
      case app_mode_webpage: // webpage? load data from cookies
        // Parse our cookie from all the cookies
        let cookies = document.cookie.split(';');
        if (document.cookie.length == 0) {  // nothing saved?! Test if we can save something at all
          document.cookie = "test=test";
          if (document.cookie.length == 0)
            alert("Sorry, but it seems that you can not save your progress.\nIt's not my fault. Blame Google.");
          document.cookie = "";  // clear all the mess we made
        } else for (var i = 0; i < cookies.length; i++){
          let key_value_pair = cookies[i].split('=');
          if (key_value_pair[0] == 'time_tracker_app') {
            saved_data = JSON.parse(decodeURI(key_value_pair[1]));
            break;
          }
        }
        break;
    }
    saved_data = (saved_data === null) ? {} : saved_data;

    // Now merge saved config with default config
    for (let saved_key of Object.keys(saved_data))
      config[saved_key] = saved_data[saved_key];
  }
}

/*
App mode is the mode of current application
It tells us if the app was runned from wepgage or within application
*/
let app_mode = "DEFAULT";
const app_mode_webpage = "WEB"; // app was runned from a web browser

const dataTable = document.getElementById('dataTable');
const btnAddEvents = document.getElementById('btnAddEvents');

/* config['saved_data'] = {
  "2017-11-11": [{
      "start": 0,
      "end": 900000,
      "category": "sleep"
    },
    {
      "start": 900000,
      "end": 4500000,
      "category": "fun"
    },
    {
      "start": 4500000,
      "end": 11700000,
      "category": "friends"
    },
    {
      "start": 12800000,
      "end": 20000000,
      "category": "fun"
    }
  ],
  "lastModified": 1512990000000
} */

const app = {
  // Application Constructor
  initialize: function() {
    document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
  },

  // deviceready Event Handler
  //
  // Bind any cordova events here. Common events are:
  // 'pause', 'resume', etc.
  onDeviceReady: function() {
    this.receivedEvent('deviceready');
    config.load();

    // Button for creating new events shows a dialog asking about what was the user doing in the time paste
    btnAddEvents.addEventListener('click', () => {
      let dialogAdd = document.getElementById ('dialogAdd');
      let dialogWindow = document.getElementById('dialogWindow');

      while (dialogWindow.firstChild) {
          dialogWindow.removeChild(dialogWindow.firstChild);
      }

      let p_question = document.createElement('p');

      if (config['saved_data']['lastModified'] == undefined) // if user is creating event for the first time, ask him about the last period
        config['saved_data']['lastModified'] = new Date(Date.now() - (config['period'] * 60 * 1000));
      let timeBegin = new Date(config['saved_data']['lastModified']);
      let timeEnd = new Date(timeBegin.getTime() + (config['period'] * 60 * 1000));

      function dateGetHours(date){
        return date.getHours() + ':' + formatNumber(date.getMinutes(), 2);
      }

      function hoursToUnixTimestamp(date){
        return ((date.getHours() * 60) + date.getMinutes()) * 60 * 1000;
      }

      let prefix = "";
      if (Math.abs(timeBegin - Date.now()) >= (24 * 3600 * 1000)) {  // if last action was saved more than a day from now
        prefix = timeBegin.getDate() + '.' + timeBegin.getMonth() + '.' + timeBegin.getFullYear() + "<br>";
      }

      p_question.innerHTML = strf("%sWhat were you doing from %s to %s?", prefix, dateGetHours(timeBegin), dateGetHours(timeEnd));
      dialogWindow.appendChild(p_question);

      for (let category of Object.keys(config['categories'])) {
        let btn = document.createElement('p');
        let dateStr = timeBegin.getFullYear() + '-' + (timeBegin.getMonth() + 1) + '-' + timeBegin.getDate();
        btn.dataset.lastEdit = true;
        btn.className = "dialogBtn";
        btn.innerHTML = category;
        btn.style.background = config['categories'][category];
        btn.addEventListener('click', ()=>{
          if(!(dateStr in config['saved_data']))
            config['saved_data'][dateStr] = new Array();
          config['saved_data'][dateStr].push({
            "start": hoursToUnixTimestamp(timeBegin),
            "end": hoursToUnixTimestamp(timeEnd),
            "category": category
          });
          config['saved_data']["lastModified"] = timeEnd;
          generateTable();
          dialogAdd.style.visibility = 'hidden';
          config.save();
        });
        dialogWindow.appendChild(btn);
      }

      dialogAdd.style.visibility = 'visible';
    });
    generateTable();
  },

  // Update DOM on a Received Event
  receivedEvent: function(id) {
    console.log('Received Event: ' + id);
  }
};


function formatNumber(number, places){
  let s = number.toString();
  while (s.length < places)
    s = "0" + s;
  return s;
}


function strf(){
  let s = arguments[0];
  for (let i = 1; i < arguments.length; i++)
    s = s.replace("%s", arguments[i]);
  return s;
}


function generateTable() {
  while (dataTable.firstChild) {
      dataTable.removeChild(dataTable.firstChild);
  }
  let periodsInDay = Math.ceil((24 * 60) / config['period']);
  let timeShift = new Date(config['period'] * 60 * 1000); // convert minutes into milliseconds.
  for (let d = 0; d < config['days']; d++) {
    let date = new Date(Date.now() - ((config['days'] - d - 1) * 24 * 3600 * 1000)); // date of the row
    let time = new Date(0); // Time in day
    let row = document.createElement('div');
    row.className = "table_row";
    row.dataset.date = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    let p_date = document.createElement('div');
    p_date.className = 'table_cell';
    p_date.innerHTML = formatNumber(date.getFullYear(), 4) + '/' + formatNumber(date.getMonth() + 1, 2) + '/' + formatNumber(date.getDate(), 2) + ':';
    row.appendChild(p_date);
    for (let p = 0; p < periodsInDay; p++) {
      let cell = document.createElement('div');
      cell.className = 'table_cell';
      cell.style.background = config.categories['unknown'];

      cell.dataset.timeBegin = time.getTime();
      time = new Date(time.getTime() + timeShift.getTime());
      cell.dataset.timeStop = time.getTime();

      row.appendChild(cell);
    }
    dataTable.appendChild(row);
  }

  for (let row of document.getElementsByClassName("table_row")) {
    if (!(row.dataset.date in config['saved_data']))
      continue;
    let dayData = config['saved_data'][row.dataset.date];
    /*
    Finds all cells that are located in given time in given row
    :param row: - the  row which are the desired cells located
    :param millisStart: - milliseconds since start the day representing the start of an event
    :param millisEnd? - milliseconds since start the day representing the end of an event
    :return: array of all cells which are filling all giver criterias
    */
    function getCellsInTimeRange(row, millisStart, millisEnd) {
      let returnArray = new Array();
      for (let child of row.children) {
        let cellStart = parseInt(child.dataset.timeBegin);
        let cellEnd = parseInt(child.dataset.timeStop);
        if ((cellStart >= millisStart) && (cellStart < millisEnd))
          returnArray.push(child);
      }
      return returnArray;
    }

    for (let event of dayData) {
      let cellColor = (event.category in config.categories) ? config.categories[event.category] : config.categories['unknown'];
      for (let cell of getCellsInTimeRange(row, event.start, event.end))
        cell.style.background = cellColor;
    }
  }
}

function genData(){
  let new_data = {};
  let timeShift = new Date(config['period'] * 60 * 1000); // convert minutes into milliseconds.
  for (let d = 0; d < config['days']; d++) {
    let date = new Date(Date.now() - ((config['days'] - d - 1) * 24 * 3600 * 1000));
    date = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    new_data[date] = new Array();
    let time = new Date(0); // Time in day
    while (time.getDate() == 1) {
      let timeBegin = time.getTime();
      time = new Date(time.getTime() + timeShift.getTime());
      new_data[date].push({
        "start": timeBegin,
        "end": time.getTime(),
        "category": Object.keys(config['categories'])[Math.floor(Object.keys(config['categories']).length * Math.random())]
      });
    }
  }
  return new_data;
}

// alert(new Date(2017, 11, 11, 12, 00, 00).getTime());

/*
Device is always ready if running right from the file
*/
if (window.location.href.startsWith('file://')) {
  app_mode = app_mode_webpage;
  app.onDeviceReady();
}
else
  app.initialize();
