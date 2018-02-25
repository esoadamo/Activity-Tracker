const FILE_DATA = "data.json"; // file with all data
const minutesInDay = 24 * 60;

let online_data = {
  'eventPrecise': 1, // how long does one period lasts in minutes
  'defaultEventMinutes': 30,
  'sleepCategory': 'sleep', // this category is used to autofill sleep
  'categories': {
    'sleep': '#687676'
  },
  'events': {}, // by default user does not have any data
}

let offline_data = {
  'account': '',
  'server': '',
  'daysToShow': 9,
  'server_data': {}
}

const backButtonActions = {};

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
        Frames.processingHide(); // the app is loaded, hide loading bar
        load();
        paintToday();
        let btnNewRecord = document.querySelector('#btnNewRecord');
        Frames.btnShow(btnNewRecord);
        btnNewRecord.addEventListener('click', () => {
          Frames.btnUndoHide();
          Frames.new_record();
        });
        let btnMoreOptions = document.querySelector('#btnMoreOptions');
        Frames.btnShow(btnMoreOptions);
        btnMoreOptions.addEventListener('click', () => {
          Frames.btnUndoHide();
          Frames.more_options();
        });
        let shownDate = document.querySelector('#shownDate');
        shownDate.addEventListener('change', () => {
          let dateData = shownDate.value.split('-'); // yyyy-mm-dd format
          generateTable(parseInt(dateData[0]), parseInt(dateData[1]), parseInt(dateData[2]), offline_data['daysToShow']);
        });

        document.querySelector('#btnJumpToToday').addEventListener('click', () => {
          paintToday();
        });

        document.addEventListener("backbutton", (e) => {
          if (Object.keys(backButtonActions).length === 0) {
            navigator.app.exitApp();
            return;
          }
          e.preventDefault();
          backButtonActions[Math.max(...Object.keys(backButtonActions))]();
        }, false);
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
function compressAll() {
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
function compressDay(year, month, day) {
  if ((year in online_data['events']) && (month in online_data['events'][year]) && (day in online_data['events'][year][month])) {
    let dayMinutes = {};
    for (let i = 0; i < minutesInDay; i++)
      dayMinutes[i] = null;
    for (let event of online_data['events'][year][month][day]) {
      let start = Math.max(event['s'], 0);  // 0 minutes is the minimum
      let duration = Math.min(event['e'], minutesInDay - 1) - start; // 23:59 is the maximum time
      let category = event['c'];

      // Skip invalid inputs
      if (duration <= 0)
        continue;

      for (let i = 0; i < duration; i++)
        dayMinutes[start + i] = category;
    }

    let newEvents = [];
    let currentEvent = null;
    for (let i = 0; i < minutesInDay; i++) {
      let category = dayMinutes[i];
      if ((category === null) && (currentEvent === null))
        continue;
      if (currentEvent === null)
        currentEvent = {
          'c': category,
          's': i
        }
      if (category === currentEvent['c'])
        continue;
      currentEvent['e'] = i; // event is not in this minute, so it has to end in the previous one
      newEvents.push(currentEvent);
      if (category === null)
        currentEvent = null;
      else
        currentEvent = {
          'c': category,
          's': i
        }
    }
    if (currentEvent !== null) {
      currentEvent['e'] = (minutesInDay);
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

  // Show btnJumpToToday button if required
  let today = new Date();
  let btnJumpToToday = document.querySelector('#btnJumpToToday');
  if (shownDate.value !== `${formatNumber(today.getFullYear(), 4)}-${formatNumber(today.getMonth() + 1, 2)}-${formatNumber(today.getDate(), 2)}`)
    Frames.btnShow(btnJumpToToday);
  else
    Frames.btnHide(btnJumpToToday);
  // Show detail day's data
  let dayTasks = document.querySelector('#dayTasks');
  dayTasks.innerHTML = '';
  let lastEventEnd = 0;
  if ((year in online_data['events']) && (month in online_data['events'][year]) && (day in online_data['events'][year][month]))
    for (let event of online_data['events'][year][month][day]) {
      if (event['e'] > lastEventEnd)
        lastEventEnd = event['e'];
      let event_id = 'event-' + Base64.encode(`${year}-${month}-${day}:${JSON.stringify(event)}`);
      let input_id = '';
      while (true) {
        input_id = 'dayTask-input-' + (Math.random() + 1).toString(36).substring(7);
        if (document.querySelector('#' + input_id) === null)
          break;
      }
      dayTasks.innerHTML += `<div class='dayTask'>
      <input id="${input_id}-s" type='time' value="${minutesToString(event['s'])}" onchange="eventChangeTime('s', '${event_id}', '${input_id}')">
      <span style='background: ${online_data['categories'][event['c']]}; color: ${online_data['categories'][event['c']]};' class='eventColor'>-</span>
      <input id="${input_id}-e" type='time' value="${minutesToString(event['e'])}" onchange="eventChangeTime('e', '${event_id}', '${input_id}')">
      <span>${[event['c']]}</span>
      </div>`;
    }

  // Hide new record button if the day is fully filled
  let btnNewRecord = document.querySelector('#btnNewRecord');
  if (lastEventEnd >= (minutesInDay) - 1)
    Frames.btnHide(btnNewRecord);
  else
    Frames.btnShow(btnNewRecord);
}


/**
 * splitClassic - this is how the split functions works in every other language
 *
 * @param  {string} string   string to split
 * @param  {string} split    split by what
 * @param  {number} limit=-1 if set to higher than -1 limits the length of the array
 * @param  {number} i=0      used in recursive calls, maximum value is same as the level if level is enabled
 * @return {array}          splitted array
 */
function splitClassic(string, split, limit = -1, i = 0) {
  let splitIndex = string.indexOf(split);
  if (i === limit)
    return [string];
  if (splitIndex === -1)
    return [];
  let splittedArray = splitClassic(string.substring(splitIndex + split.length), split, limit, limit > -1 ? i + 1 : -1);
  splittedArray.splice(0, 0, string.substring(0, splitIndex));
  return splittedArray;
}


/**
 * eventGetLocation - finds year, month, day and index from eventData
 *
 * @param  {string} eventData event data in format yyyy-mm-dd:eventJSONDict
 * @return {array}           [year, month, day, indexInDayArray]
 */
function eventGetLocation(eventData) {
  let dateAndValue = splitClassic(eventData, ':', 1);
  let date = dateAndValue[0].split('-');
  let year = date[0];
  let month = date[1];
  let day = date[2];
  let targetEvent = JSON.parse(dateAndValue[1]);
  if ((year in online_data['events']) && (month in online_data['events'][year]) && (day in online_data['events'][year][month])) {
    for (let i = 0; i < online_data['events'][year][month][day].length; i++) {
      let event = online_data['events'][year][month][day][i];
      if ((event['e'] === targetEvent['e']) && (event['s'] === targetEvent['s']) && (event['c'] === targetEvent['c']))
        return [year, month, day, i];
    }
  }
  return null;
}

/**
 * eventChangeTime - changes time of event, based on GUI day task change
 *
 * @param  {string} startOrEnd 's' or 'e'
 * @param  {string} eventID    base64 encoded id or tag or event
 * @param  {string} inputID    id of the calling dom the new value is taken from
 * @return {undefined}
 */
function eventChangeTime(startOrEnd, eventID, inputID) {
  let inputDOM = document.querySelector('#' + inputID + '-' + startOrEnd);
  let eventLocation = eventGetLocation(Base64.decode(splitClassic(eventID, '-', 1)[1]));
  if (eventLocation === null)
    return;
  let year = eventLocation[0];
  let month = eventLocation[1];
  let day = eventLocation[2];

  let undoTimeout = 7;
  let undoCopy = online_data['events'][year][month][day].slice();
  Frames.btnUndoShow(() => {
    online_data['events'][year][month][day] = undoCopy;
    save();
    generateTable(year, month, day);
  }, undoTimeout);

  let event = JSON.parse(JSON.stringify(online_data['events'][year][month][day].splice([eventLocation[3]], 1)[0]));
  event[startOrEnd] = stringToMinutes(inputDOM.value);
  online_data['events'][year][month][day].push(event);
  compressDay(year, month, day);

  save();
  generateTable(year, month, day);
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
  canvas.width = textWidth + (minutesInDay);
  // Paint background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  for (let day = 1; day <= daysInMonth; day++) {
    let upperPos = lineHeight * day;
    // Paint day number
    ctx.fillStyle = "#000000";
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

Frames.processingShow("The application is launching");
app.initialize();
