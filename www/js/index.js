const FILE_DATA = "data.json"; // file with all data

let online_data = {
  'period': 30, // how long does one period lasts in minutes
  'categories': {},
  'events': {}, // by default user does not have any data
}

let offline_data = {
  'account': '',
  'server': '',
  'server_data': {}
}

/**
 * paintToday - repaints the canvas with current date (year and month)
 *
 * @return {undefined}
 */
function paintToday() {
  let today = new Date();
  generateTable(today.getFullYear(), today.getMonth() + 1);
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
    big_dict = {'online': online_data, 'offline': offline_data};
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
 * generateTable - repaints the table canvas to show selected year and month
 *
 * @param  {number} year  year to show (0-2012)
 * @param  {number} month month to show (1-12)
 * @return {undefined}
 */
function generateTable(year, month) {
  let daysInMonth = new Date(year, month, 0).getDate();
  let container = document.querySelector('#overCanvas');
  const minutesInDay = 24 * 60;
  for (let day = 1; day <= daysInMonth; day++) {
    let dayDOM = document.createElement('span');
    dayDOM.className = 'paintedDay';
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
    container.appendChild(dayDOM);
  }
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

online_data = JSON.parse(`{"period":30,"categories":{"oslava":"#ffff00","family bussines":"#ffff00","sleep":"#919191","gaming":"#00ff00","TV":"#0000ff","wasting":"#a3a365","programming":"#a700d6","food":"#ad6e00","transportation":"#4b5dab","work":"#820000","home school":"#005400","gf":"#ff00ff","stuff":"#ccad00","school":"#007500","friends":"#0000ff","outside":"#40ff40","sport":"#ffff70","IT stuff":"#b300b3"},"events":{"2017":{"12":{"31":[]}},"2018":{"1":{"1":[{"s":0,"e":33,"c":"family bussines"},{"s":33,"e":46,"c":"gaming"},{"s":46,"e":60,"c":"gaming"},{"s":60,"e":100,"c":"TV"},{"s":100,"e":190,"c":"gaming"},{"s":190,"e":208,"c":"gaming"},{"s":208,"e":730,"c":"sleep"},{"s":730,"e":760,"c":"wasting"},{"s":760,"e":790,"c":"programming"},{"s":790,"e":820,"c":"food"},{"s":820,"e":850,"c":"transportation"},{"s":850,"e":975,"c":"work"},{"s":975,"e":1140,"c":"home school"},{"s":1140,"e":1170,"c":"gaming"},{"s":1170,"e":1200,"c":"food"},{"s":1200,"e":1273,"c":"gaming"},{"s":1273,"e":1439,"c":"gaming"}],"2":[{"s":0,"e":30,"c":"gaming"},{"s":30,"e":570,"c":"sleep"},{"s":570,"e":600,"c":"wasting"},{"s":600,"e":735,"c":"home school"},{"s":735,"e":750,"c":"transportation"},{"s":750,"e":1110,"c":"gf"},{"s":1110,"e":1140,"c":"transportation"},{"s":1140,"e":1170,"c":"food"},{"s":1170,"e":1200,"c":"wasting"},{"s":1200,"e":1310,"c":"home school"},{"s":1310,"e":1350,"c":"wasting"}],"3":[{"s":0,"e":402,"c":"sleep"},{"s":402,"e":440,"c":"stuff"},{"s":440,"e":470,"c":"transportation"},{"s":470,"e":830,"c":"school"},{"s":830,"e":860,"c":"stuff"},{"s":860,"e":890,"c":"stuff"},{"s":890,"e":920,"c":"transportation"},{"s":920,"e":950,"c":"stuff"},{"s":950,"e":980,"c":"oslava"},{"s":980,"e":1140,"c":"home school"},{"s":1140,"e":1170,"c":"food"},{"s":1170,"e":1330,"c":"home school"},{"s":1330,"e":1370,"c":"stuff"}],"4":[{"s":0,"e":30,"c":"oslava"},{"s":30,"e":400,"c":"sleep"},{"s":400,"e":430,"c":"stuff"},{"s":430,"e":460,"c":"transportation"},{"s":460,"e":895,"c":"school"},{"s":895,"e":1005,"c":"stuff"},{"s":1005,"e":1020,"c":"stuff"},{"s":1020,"e":1050,"c":"wasting"},{"s":1050,"e":1140,"c":"home school"},{"s":1140,"e":1170,"c":"food"},{"s":1170,"e":1320,"c":"home school"},{"s":1320,"e":1396,"c":"wasting"}],"5":[{"s":0,"e":400,"c":"sleep"},{"s":400,"e":450,"c":"stuff"},{"s":450,"e":475,"c":"transportation"},{"s":475,"e":765,"c":"school"},{"s":765,"e":810,"c":"stuff"},{"s":810,"e":840,"c":"stuff"},{"s":840,"e":870,"c":"transportation"},{"s":870,"e":900,"c":"stuff"},{"s":900,"e":930,"c":"stuff"},{"s":930,"e":960,"c":"transportation"},{"s":960,"e":1020,"c":"transportation"}],"6":[{"s":0,"e":105,"c":"friends"},{"s":105,"e":500,"c":"sleep"},{"s":500,"e":547,"c":"friends"},{"s":547,"e":580,"c":"transportation"},{"s":580,"e":710,"c":"work"},{"s":710,"e":740,"c":"stuff"},{"s":740,"e":770,"c":"food"},{"s":770,"e":1020,"c":"stuff"},{"s":1020,"e":1080,"c":"transportation"},{"s":1080,"e":1123,"c":"outside"},{"s":1123,"e":1140,"c":"sport"},{"s":1140,"e":1170,"c":"transportation"},{"s":1170,"e":1200,"c":"stuff"},{"s":1200,"e":1275,"c":"programming"},{"s":1275,"e":1305,"c":"food"},{"s":1305,"e":1380,"c":"programming"}],"7":[{"s":0,"e":660,"c":"sleep"},{"s":660,"e":750,"c":"wasting"},{"s":750,"e":780,"c":"food"},{"s":780,"e":855,"c":"programming"},{"s":855,"e":930,"c":"gaming"},{"s":930,"e":1155,"c":"food"},{"s":1155,"e":1185,"c":"stuff"},{"s":1185,"e":1215,"c":"programming"},{"s":1215,"e":1245,"c":"wasting"},{"s":1245,"e":1380,"c":"home school"},{"s":1380,"e":1395,"c":"stuff"}],"8":[{"s":0,"e":400,"c":"sleep"},{"s":400,"e":450,"c":"stuff"},{"s":450,"e":530,"c":"stuff"},{"s":390,"e":470,"c":"transportation"},{"s":530,"e":890,"c":"school"},{"s":890,"e":933,"c":"gf"},{"s":933,"e":970,"c":"stuff"},{"s":970,"e":1000,"c":"transportation"},{"s":1000,"e":1030,"c":"transportation"},{"s":1030,"e":1140,"c":"programming"},{"s":1140,"e":1170,"c":"food"},{"s":1170,"e":1290,"c":"programming"},{"s":1290,"e":1320,"c":"programming"},{"s":1320,"e":1350,"c":"school"},{"s":1350,"e":1380,"c":"stuff"}],"9":[{"s":0,"e":400,"c":"sleep"},{"s":400,"e":455,"c":"stuff"},{"s":455,"e":475,"c":"transportation"},{"s":475,"e":893,"c":"school"},{"s":893,"e":923,"c":"stuff"},{"s":923,"e":942,"c":"transportation"},{"s":942,"e":1040,"c":"stuff"},{"s":1040,"e":1070,"c":"stuff"},{"s":1070,"e":1100,"c":"programming"},{"s":1100,"e":1130,"c":"wasting"},{"s":1130,"e":1160,"c":"wasting"},{"s":1160,"e":1190,"c":"food"},{"s":1190,"e":1220,"c":"stuff"},{"s":1220,"e":1320,"c":"home school"}],"10":[{"s":0,"e":400,"c":"sleep"},{"s":400,"e":450,"c":"transportation"},{"s":400,"e":450,"c":"stuff"},{"s":450,"e":470,"c":"transportation"},{"s":470,"e":888,"c":"school"},{"s":888,"e":918,"c":"transportation"},{"s":918,"e":990,"c":"gaming"},{"s":990,"e":1110,"c":"stuff"},{"s":1110,"e":1140,"c":"food"},{"s":1140,"e":1170,"c":"wasting"},{"s":1170,"e":1200,"c":"wasting"},{"s":1200,"e":1337,"c":"school"},{"s":1337,"e":1385,"c":"stuff"}],"11":[{"s":0,"e":405,"c":"sleep"},{"s":405,"e":435,"c":"oslava"},{"s":405,"e":450,"c":"stuff"},{"s":450,"e":471,"c":"transportation"},{"s":471,"e":920,"c":"school"},{"s":920,"e":950,"c":"stuff"},{"s":950,"e":980,"c":"stuff"},{"s":980,"e":1015,"c":"school"},{"s":1015,"e":1045,"c":"transportation"},{"s":1045,"e":1320,"c":"home school"},{"s":1320,"e":1350,"c":"stuff"},{"s":1350,"e":1380,"c":"stuff"}],"12":[{"s":0,"e":405,"c":"sleep"},{"s":405,"e":455,"c":"stuff"},{"s":455,"e":600,"c":"school"},{"s":600,"e":630,"c":"stuff"},{"s":630,"e":835,"c":"school"},{"s":835,"e":995,"c":"gf"},{"s":995,"e":1050,"c":"stuff"},{"s":1050,"e":1075,"c":"work"},{"s":1075,"e":1090,"c":"transportation"},{"s":1090,"e":1140,"c":"stuff"},{"s":1140,"e":1200,"c":"programming"},{"s":1200,"e":1335,"c":"work"},{"s":1335,"e":1439,"c":"stuff"}],"13":[{"s":0,"e":80,"c":"stuff"},{"s":80,"e":600,"c":"sleep"},{"s":600,"e":630,"c":"stuff"},{"s":630,"e":1020,"c":"work"},{"s":1020,"e":1035,"c":"transportation"},{"s":1035,"e":1105,"c":"work"},{"s":1105,"e":1130,"c":"transportation"},{"s":1130,"e":1236,"c":"work"}],"14":[{"s":0,"e":30,"c":"gaming"},{"s":30,"e":80,"c":"stuff"},{"s":80,"e":570,"c":"sleep"},{"s":570,"e":620,"c":"stuff"},{"s":620,"e":638,"c":"transportation"},{"s":638,"e":715,"c":"work"},{"s":715,"e":730,"c":"transportation"},{"s":730,"e":810,"c":"work"},{"s":810,"e":840,"c":"food"},{"s":840,"e":870,"c":"wasting"},{"s":870,"e":900,"c":"stuff"},{"s":900,"e":960,"c":"stuff"},{"s":960,"e":975,"c":"work"},{"s":975,"e":995,"c":"transportation"},{"s":995,"e":1030,"c":"work"},{"s":1030,"e":1042,"c":"wasting"},{"s":1042,"e":1067,"c":"transportation"},{"s":1067,"e":1110,"c":"stuff"},{"s":1110,"e":1155,"c":"gaming"},{"s":1155,"e":1185,"c":"food"},{"s":1185,"e":1215,"c":"gaming"},{"s":1215,"e":1415,"c":"stuff"}],"15":[{"s":0,"e":405,"c":"sleep"},{"s":405,"e":467,"c":"stuff"},{"s":467,"e":536,"c":"transportation"},{"s":476,"e":540,"c":"school"},{"s":540,"e":887,"c":"school"},{"s":887,"e":1174,"c":"gf"},{"s":1174,"e":1204,"c":"work"},{"s":1174,"e":1234,"c":"stuff"},{"s":1234,"e":1264,"c":"food"}],"16":[{"s":0,"e":400,"c":"sleep"},{"s":400,"e":430,"c":"stuff"},{"s":430,"e":510,"c":"transportation"},{"s":510,"e":780,"c":"school"},{"s":780,"e":870,"c":"transportation"},{"s":870,"e":900,"c":"food"},{"s":900,"e":930,"c":"food"},{"s":930,"e":960,"c":"stuff"},{"s":960,"e":990,"c":"gaming"},{"s":990,"e":1170,"c":"stuff"},{"s":1170,"e":1200,"c":"food"},{"s":1200,"e":1348,"c":"stuff"}],"17":[{"s":0,"e":380,"c":"sleep"},{"s":380,"e":425,"c":"stuff"},{"s":425,"e":432,"c":"transportation"},{"s":432,"e":835,"c":"school"},{"s":835,"e":850,"c":"transportation"},{"s":850,"e":1020,"c":"stuff"},{"s":1020,"e":1060,"c":"sleep"},{"s":1060,"e":1090,"c":"stuff"},{"s":1090,"e":1120,"c":"food"},{"s":1120,"e":1420,"c":"stuff"},{"s":1365,"e":1439,"c":"sleep"}],"18":[{"s":0,"e":400,"c":"sleep"},{"s":400,"e":470,"c":"stuff"},{"s":470,"e":473,"c":"transportation"},{"s":473,"e":885,"c":"school"},{"s":885,"e":915,"c":"transportation"},{"s":915,"e":1080,"c":"stuff"},{"s":1080,"e":1110,"c":"food"},{"s":1110,"e":1370,"c":"home school"},{"s":1370,"e":1400,"c":"wasting"}],"19":[{"s":0,"e":405,"c":"sleep"},{"s":405,"e":460,"c":"stuff"},{"s":460,"e":472,"c":"transportation"},{"s":472,"e":840,"c":"school"},{"s":840,"e":1000,"c":"gf"},{"s":1000,"e":1030,"c":"transportation"},{"s":1030,"e":1060,"c":"stuff"},{"s":1060,"e":1245,"c":"family bussines"},{"s":1245,"e":1330,"c":"wasting"}],"20":[{"s":0,"e":570,"c":"sleep"},{"s":570,"e":600,"c":"wasting"},{"s":600,"e":630,"c":"transportation"},{"s":630,"e":690,"c":"work"},{"s":690,"e":720,"c":"transportation"},{"s":720,"e":760,"c":"stuff"},{"s":760,"e":790,"c":"food"},{"s":790,"e":820,"c":"transportation"},{"s":820,"e":1200,"c":"friends"},{"s":1200,"e":1230,"c":"stuff"},{"s":1230,"e":1260,"c":"food"},{"s":1260,"e":1439,"c":"programming"}],"21":[{"s":0,"e":20,"c":"stuff"},{"s":20,"e":560,"c":"sleep"},{"s":560,"e":590,"c":"food"},{"s":590,"e":705,"c":"programming"},{"s":705,"e":735,"c":"food"},{"s":735,"e":805,"c":"stuff"},{"s":805,"e":936,"c":"gaming"},{"s":936,"e":995,"c":"gaming"},{"s":995,"e":1157,"c":"programming"},{"s":1157,"e":1187,"c":"food"},{"s":1187,"e":1400,"c":"home school"}],"22":[{"s":0,"e":400,"c":"sleep"},{"s":400,"e":440,"c":"stuff"},{"s":440,"e":447,"c":"transportation"},{"s":447,"e":477,"c":"gf"},{"s":477,"e":885,"c":"school"},{"s":885,"e":890,"c":"transportation"},{"s":890,"e":920,"c":"stuff"},{"s":920,"e":1000,"c":"stuff"},{"s":1000,"e":1120,"c":"programming"},{"s":1120,"e":1140,"c":"food"},{"s":1140,"e":1260,"c":"programming"},{"s":1260,"e":1290,"c":"stuff"},{"s":1290,"e":1410,"c":"stuff"}],"23":[{"s":0,"e":410,"c":"sleep"},{"s":410,"e":455,"c":"stuff"},{"s":455,"e":465,"c":"transportation"},{"s":465,"e":935,"c":"school"},{"s":935,"e":960,"c":"transportation"},{"s":960,"e":990,"c":"work"},{"s":990,"e":1020,"c":"transportation"},{"s":1020,"e":1140,"c":"wasting"},{"s":1140,"e":1170,"c":"food"},{"s":1170,"e":1410,"c":"wasting"}],"24":[{"s":0,"e":405,"c":"sleep"},{"s":405,"e":440,"c":"stuff"},{"s":440,"e":450,"c":"transportation"},{"s":450,"e":465,"c":"gf"},{"s":465,"e":832,"c":"school"},{"s":832,"e":860,"c":"transportation"},{"s":860,"e":1110,"c":"wasting"},{"s":1110,"e":1140,"c":"food"},{"s":1140,"e":1090,"c":"wasting"},{"s":1140,"e":1170,"c":"stuff"},{"s":1170,"e":1360,"c":"home school"},{"s":1360,"e":1410,"c":"stuff"}],"25":[{"s":0,"e":395,"c":"sleep"},{"s":395,"e":460,"c":"stuff"},{"s":460,"e":465,"c":"work"},{"s":460,"e":465,"c":"transportation"},{"s":465,"e":840,"c":"school"},{"s":840,"e":870,"c":"transportation"},{"s":870,"e":990,"c":"programming"},{"s":990,"e":1020,"c":"programming"},{"s":1020,"e":1050,"c":"stuff"},{"s":1050,"e":1110,"c":"home school"},{"s":1110,"e":1140,"c":"food"},{"s":1140,"e":1200,"c":"stuff"},{"s":1200,"e":1290,"c":"TV"},{"s":1290,"e":1320,"c":"stuff"},{"s":1320,"e":1362,"c":"stuff"}],"26":[{"s":0,"e":410,"c":"sleep"},{"s":410,"e":462,"c":"stuff"},{"s":462,"e":472,"c":"transportation"},{"s":472,"e":780,"c":"school"},{"s":780,"e":800,"c":"transportation"},{"s":800,"e":820,"c":"stuff"},{"s":820,"e":835,"c":"transportation"},{"s":835,"e":1005,"c":"gf"},{"s":1005,"e":1020,"c":"transportation"},{"s":1020,"e":1050,"c":"stuff"},{"s":1050,"e":1110,"c":"food"},{"s":1110,"e":1170,"c":"wasting"},{"s":1170,"e":1215,"c":"stuff"},{"s":1215,"e":1380,"c":"gaming"},{"s":1380,"e":1425,"c":"wasting"}],"27":[{"s":0,"e":570,"c":"sleep"},{"s":570,"e":600,"c":"IT stuff"},{"s":600,"e":810,"c":"programming"},{"s":810,"e":840,"c":"food"},{"s":840,"e":870,"c":"programming"},{"s":870,"e":900,"c":"stuff"},{"s":900,"e":930,"c":"transportation"},{"s":930,"e":991,"c":"sport"},{"s":991,"e":1115,"c":"stuff"},{"s":1115,"e":1145,"c":"transportation"},{"s":1145,"e":1439,"c":"transportation"}],"28":[{"s":0,"e":290,"c":"friends"},{"s":290,"e":345,"c":"transportation"},{"s":345,"e":360,"c":"stuff"},{"s":360,"e":630,"c":"sleep"},{"s":630,"e":750,"c":"wasting"},{"s":750,"e":780,"c":"food"},{"s":780,"e":900,"c":"gaming"},{"s":900,"e":1110,"c":"programming"},{"s":1110,"e":1140,"c":"food"},{"s":1140,"e":1170,"c":"gaming"}],"29":[{"s":0,"e":410,"c":"sleep"},{"s":410,"e":460,"c":"stuff"},{"s":460,"e":470,"c":"transportation"},{"s":470,"e":477,"c":"gf"},{"s":477,"e":875,"c":"school"},{"s":875,"e":887,"c":"friends"},{"s":887,"e":995,"c":"gf"},{"s":995,"e":1025,"c":"transportation"},{"s":1025,"e":1125,"c":"wasting"},{"s":1125,"e":1155,"c":"food"},{"s":1155,"e":1395,"c":"stuff"}],"30":[{"s":0,"e":410,"c":"sleep"},{"s":410,"e":465,"c":"stuff"},{"s":465,"e":470,"c":"transportation"},{"s":470,"e":885,"c":"school"},{"s":885,"e":915,"c":"transportation"},{"s":915,"e":1130,"c":"wasting"},{"s":1130,"e":1160,"c":"food"},{"s":1160,"e":1240,"c":"sleep"},{"s":1240,"e":1270,"c":"stuff"},{"s":1270,"e":1360,"c":"wasting"}],"31":[{"s":0,"e":400,"c":"sleep"},{"s":400,"e":465,"c":"stuff"},{"s":465,"e":470,"c":"transportation"},{"s":470,"e":1025,"c":"school"},{"s":1025,"e":1020,"c":"wasting"},{"s":1025,"e":1055,"c":"food"},{"s":1055,"e":1140,"c":"wasting"},{"s":1140,"e":1170,"c":"sleep"},{"s":1170,"e":1335,"c":"wasting"}]},"2":{"1":[{"s":0,"e":405,"c":"sleep"},{"s":405,"e":460,"c":"wasting"},{"s":460,"e":500,"c":"IT stuff"},{"s":500,"e":530,"c":"IT stuff"},{"s":530,"e":600,"c":"TV"},{"s":600,"e":880,"c":"sleep"},{"s":880,"e":1030,"c":"wasting"},{"s":1030,"e":1060,"c":"IT stuff"},{"s":1060,"e":1090,"c":"TV"},{"s":1090,"e":1140,"c":"food"}],"2":[{"s":0,"e":560,"c":"sleep"},{"s":560,"e":660,"c":"IT stuff"},{"s":660,"e":690,"c":"food"}]}}},"account":"adam","server":"https://adamhlavacek.com/act"}`);
app.initialize();
generateTable(2018, 1);
