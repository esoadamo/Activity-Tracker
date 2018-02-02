const FILE_DATA = "data.json"; // file with all data

let online_data = {
  'period': 30, // how long does one period lasts in minutes
  'categories': {},
  'events': {}, // by default user does not have any data
}

let offline_data = {
  'account': '',
  'server': '',
  'daysToShow': 9,
  'server_data': {}
}

/**
 * paintToday - repaints the canvas with current date (year and month)
 *
 * @return {undefined}
 */
function paintToday() {
  let today = new Date();
  generateTable(today.getFullYear(), today.getMonth() + 1, today.getDate(), offline_data['daysToShow']);
}

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
  },

  // Update DOM on a Received Event
  receivedEvent: function(id) {
    console.log('Received Event: ' + id);
    switch (id) {
      case 'deviceready':
        load();
        paintToday();
        let btnNewRecord = document.querySelector('#btnNewRecord');
        btnNewRecord.addEventListener('click', () => {
          Frames.new_record();
        });
        let btnMoreOptions = document.querySelector('#btnMoreOptions');
        btnMoreOptions.addEventListener('click', () => {
          Frames.more_options();
        });
        let shownDate = document.querySelector('#shownDate');
        shownDate.addEventListener('change', () => {
          let dateData = shownDate.value.split('-'); // yyyy-mm-dd format
          generateTable(parseInt(dateData[0]), parseInt(dateData[1]), parseInt(dateData[2]), offline_data['daysToShow']);
        });
        break;
    }
  }
};

/**
 * stringToMinutes - converts HTML input's tag with type time value into number of minutes
 *
 * @param  {string} string HH:MM formatted time
 * @return {number}        number of minutes from the time mark 00:00
 */
function stringToMinutes(string) {
  s = string.split(':');
  return (parseInt(s[0]) * 60) + parseInt(s[1]);
}

/**
 * minutesToString - converts number of minutes from midnight into HH:MM format
 *
 * @param  {number} minutes number of minutes from the time mark 00:00
 * @return {string}         HH:MM formatted time
 */
function minutesToString(minutes) {
  return formatNumber(Math.floor(minutes / 60), 2) + ':' + formatNumber(minutes % 60, 2);
}

/**
 * formatNumber - formats short number to some number of places (prefifxing short number with zeroes)
 *
 * @param  {number} number number to format
 * @param  {number} places minimal length of the number
 * @return {string}        string representation of number with minimal specified length
 */
function formatNumber(number, places) {
  let s = number.toString();
  while (s.length < places)
    s = "0" + s;
  return s;
}

/**
 * strf - Replaces every %s in string with argument
 * Example: strf("Hi, %s. This is %s", "Adam", "TimeTracker") produces "Hi, Adam. This is TimeTracker"
 *
 * @return {string}  formatted string
 */
function strf() {
  let s = arguments[0];
  for (let i = 1; i < arguments.length; i++)
    s = s.replace("%s", arguments[i]);
  return s;
}

/**
 * save - saved current data to the data file
 *
 * @return {undefined}
 */
function save() {
  FilesManipulator.open(FILE_DATA, (file) => {
    big_dict = {
      'online': online_data,
      'offline': offline_data
    };
    file.write(JSON.stringify(big_dict));
  });
  if (('account' in offline_data) && ('server' in offline_data) && (offline_data['server'].length > 0))
    Server.push();
}

/**
 * load - load saved state from the data file
 *
 * @return {undefined}
 */
function load() {
  FilesManipulator.open(FILE_DATA, (file) => {
    file.read((d) => {
      if (d.trim().length === 0)
        return;
      big_dict = JSON.parse(d);
      if ('online' in big_dict)
        online_data = big_dict['online'];
      if ('offline' in big_dict)
        offline_data = big_dict['offline'];
      else
        online_data = big_dict; // Old version compatibility
      paintToday();
    });
  });
}


/**
 * compressAll - compresses all saved data
 *
 * @return {undefined}
 */
function compressAll(){
  for (let year of Object.keys(online_data['events']))
    for (let month of Object.keys(online_data['events'][year]))
      for (let day of Object.keys(online_data['events'][year][month]))
        compressDay(year, month, day);
}

/**
 * compressDay - compressed online data of the day, merging splited continuous events, removing invalid events and overlays
 *
 * @param  {number} year  year to compress
 * @param  {number} month month to compress
 * @param  {number} day   day to compress
 * @return {undefined}
 */
function compressDay(year, month, day){
    if ((year in online_data['events']) && (month in online_data['events'][year]) && (day in online_data['events'][year][month])) {
      let dayMinutes = {};
      for (let i = 0; i < 24 * 60; i++)
        dayMinutes[i] = null;
      for (let event of online_data['events'][year][month][day]) {
        let start = event['s'];
        let duration = event['e'] - start;
        let category = event['c'];

        // Skip invalid inputs
        if (duration < 0)
          continue;

        for (let i = 0; i < duration; i++)
          dayMinutes[start + i] = category;
      }

      let newEvents = [];
      let currentEvent = null;
      for (let i = 0; i < 24 * 60; i++){
        let category = dayMinutes[i];
        if ((category === null) && (currentEvent === null))
            continue;
        if (currentEvent === null)
          currentEvent = {'c': category, 's': i}
        if (category === currentEvent['c'])
          continue;
        currentEvent['e'] = i; // event is not in this minute, so it has to end in the previous one
        newEvents.push(currentEvent);
        if (category === null)
          currentEvent = null;
        else
          currentEvent = {'c': category, 's': i}
      }
      if (currentEvent !== null){
        currentEvent['e'] = (24 * 60);
        newEvents.push(currentEvent);
      }

      online_data['events'][year][month][day] = newEvents;
    }
}

/**
 * generateTable - repaints the table canvas to show selected year and month
 *
 * @param  {number} year  year to show (0-2012)
 * @param  {number} month month to show (1-12)
 * @param  {day} month day to show in center (1-12)
 * @return {undefined}
 */
function generateTable(year, month, day, daysToShow = null) {

  /*
  generate upper columns with data
  */
  if (daysToShow === null) {
    if (!('daysToShow' in offline_data))
      offline_data['daysToShow'] = 31;
    daysToShow = offline_data['daysToShow'];
  }

  if (daysToShow !== offline_data['daysToShow']) {
    offline_data['daysToShow'] = daysToShow;
    save();
  }
  let container = document.querySelector('#overCanvas');
  container.innerHTML = '';
  const centerDate = new Date(year, month - 1, day);
  const minutesInDay = 24 * 60;
  for (let i = 0; i < daysToShow; i++) {
    let dayDate = new Date(centerDate.getTime() - ((Math.floor(daysToShow / 2) - i) * 24 * 3600 * 1000));
    let dayDOM = document.createElement('span');
    dayDOM.className = 'paintedDay';

    if (Math.abs(dayDate.getTime() - centerDate.getTime()) < 18000) {
      dayDOM.style.filter = 'brightness(1.5)';
    }

    let year = dayDate.getFullYear();
    let month = dayDate.getMonth() + 1;
    let day = dayDate.getDate();
    if ((year in online_data['events']) && (month in online_data['events'][year]) && (day in online_data['events'][year][month])) {
      let subDay = document.createElement('div');
      subDay.style.width = '100%';
      subDay.style.height = '100%';
      subDay.style.position = 'relative';
      for (let event of online_data['events'][year][month][day]) {
        let dayPart = document.createElement('div');
        dayPart.style.background = online_data['categories'][event['c']];
        dayPart.style.width = '100%';
        dayPart.style.position = 'absolute';

        let percentageTaken = (event['e'] - event['s']) * 100 / minutesInDay; // how many % of day
        let percentageStart = event['s'] * 100 / minutesInDay;

        dayPart.style.top = `${100 - percentageStart - percentageTaken}%`;
        dayPart.style.height = `${percentageTaken}%`;

        subDay.appendChild(dayPart);
      }
      dayDOM.appendChild(subDay);
    }

    // On column click, show that date
    dayDOM.addEventListener('click', () => {
      generateTable(year, month, day, daysToShow);
    });

    container.appendChild(dayDOM);
  }

  // Change shown date value
  let shownDate = document.querySelector('#shownDate');
  shownDate.value = `${formatNumber(year, 4)}-${formatNumber(month, 2)}-${formatNumber(day, 2)}`;

  // Show detail day's data
  let dayTasks = document.querySelector('#dayTasks');
  dayTasks.innerHTML = '';
  if ((year in online_data['events']) && (month in online_data['events'][year]) && (day in online_data['events'][year][month]))
    for (let event of online_data['events'][year][month][day])
      dayTasks.innerHTML += `<div class='dayTask'><input type='time' value="${minutesToString(event['s'])}"><span style='background: ${online_data['categories'][event['c']]};' class='eventColor'></span><input type='time' value="${minutesToString(event['e'])}"></span><span>${[event['c']]}</span></div>`;
}


/**
 * generateExportTable - repaints the table canvas to show selected year and month
 *
 * @param  {number} year  year to show (0-2012)
 * @param  {number} month month to show (1-12)
 * @return {undefined}
 */
function generateExportTable(year, month) {
  let daysInMonth = new Date(year, month, 0).getDate();
  let canvas = document.querySelector('#timeCanvas');
  let lineHeight = 35;
  let fontHeight = 30;
  canvas.height = lineHeight * daysInMonth;
  let lineGap = Math.abs(lineHeight - fontHeight) / 2;
  let ctx = canvas.getContext("2d");
  ctx.font = `${fontHeight}px monotype`
  let textWidth = ctx.measureText('01').width;
  canvas.width = textWidth + (24 * 60);
  // Paint background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  for (let day = 1; day <= daysInMonth; day++) {
    let upperPos = lineHeight * day;
    // Paint day number
    ctx.fillText(formatNumber(day, 2), 0, upperPos);
    // Paint lower line
    ctx.beginPath();
    ctx.moveTo(0, upperPos + lineGap);
    ctx.lineTo(canvas.width, upperPos + lineGap);
    ctx.stroke();
    // Paint all events of this day with their category color
    if ((year in online_data['events']) && (month in online_data['events'][year]) && (day in online_data['events'][year][month])) {
      for (let event of online_data['events'][year][month][day]) {
        ctx.fillStyle = online_data['categories'][event['c']];
        ctx.fillRect(textWidth + event['s'], upperPos - lineHeight, event['e'] - event['s'], lineHeight);
      }
    }
  }
  // Paint the line separating date from events
  ctx.beginPath();
  ctx.moveTo(textWidth, 0);
  ctx.lineTo(textWidth, canvas.height);
  ctx.stroke();
}

app.initialize();
