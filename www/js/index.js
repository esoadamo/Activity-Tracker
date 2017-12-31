let saved_data = {
  'period': 30, // how long does one period lasts in minutes
  'categories': {},
  'events': {}, // by default user does not have any data
}

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
        let btnNewRecord = document.querySelector('#newRecord');
        btnNewRecord.addEventListener('click', () => {
          let today = new Date();
          let overlay = document.createElement('div');
          overlay.className = 'overlay';
          document.body.appendChild(overlay);

          let year = today.getFullYear().toString();
          let month = (today.getMonth() + 1).toString();
          let day = today.getDate();
          if (!(year in saved_data['events']))
            saved_data['events'][year] = {};
          if (!(month in saved_data['events'][year]))
            saved_data['events'][year][month] = {};

          let timeStart = 0;
          if (!(day in saved_data['events'][year][month]))
            saved_data['events'][year][month][day] = [];
          else
            for (let event of saved_data['events'][year][month][day])
              if (event['e'] > timeStart)
                timeStart = event['e'];

          let overlayText = document.createElement('div');
          overlayText.innerHTML = `What were you doing from <input id='inputStart' type="time" value="${minutesToString(timeStart)}"> to <input id='inputEnd' type="time" value="${minutesToString(timeStart + saved_data['period'])}">?`;
          overlay.appendChild(overlayText);
          function createCategoryButton(category){
            let categoryBtn = document.createElement('button');
            categoryBtn.className = 'button';
            categoryBtn.style.background = saved_data['categories'][category];
            categoryBtn.innerHTML = category;
            categoryBtn.addEventListener('click', () => {
              let inputStart = document.querySelector('#inputStart');
              let inputEnd = document.querySelector('#inputEnd');
              saved_data['events'][year][month][day].push({
                's': stringToMinutes(inputStart.value),
                'e': stringToMinutes(inputEnd.value),
                'c': category
              });
              overlay.parentNode.removeChild(overlay);
              save();
              paintToday();
            });
            overlay.appendChild(categoryBtn);
          }
          for (let category of Object.keys(saved_data['categories']))
            createCategoryButton(category);
          let newCategoryBtn = document.createElement('button');
          newCategoryBtn.className = 'button';
          newCategoryBtn.textContent = '+';
          overlay.appendChild(newCategoryBtn);
          newCategoryBtn.addEventListener('click', () => {
            let overoverlay = document.createElement('div');
            overoverlay.className = 'overlay';
            overoverlay.style.zIndex = 1001;
            document.body.appendChild(overoverlay);
            overoverlay.innerHTML = `<div class="button" style="display:flex; flex-direction: row; height: 30vh;">
                <input type="color" style="flex-grow: 1; height: 100%; min-width: 20%" id="catColor">
                <input type="text" placeholder="Category name"  style="flex-grow: 3; height: 100%; font-size: 5vh;" id="catName">
              </div>`;
            let btnOk = document.createElement('button');
            btnOk.className = 'button';
            btnOk.innerHTML = 'save';
            btnOk.style.background = '#2b5e42';
            btnOk.addEventListener('click', ()=>{
              let newCategory = document.querySelector('#catName').value;
              if (newCategory.trim().length == 0){
                alert('Category name should not be empty');
                return;
              }
              if (newCategory in saved_data['categories']){
                alert('This category already exists');
                return;
              }
              saved_data['categories'][newCategory] = document.querySelector('#catColor').value;
              createCategoryButton(newCategory);
              overoverlay.parentNode.removeChild(overoverlay);
              save();
            });
            let btnCancel = document.createElement('button');
            btnCancel.className = 'button';
            btnCancel.innerHTML = 'cancel';
            btnCancel.style.background = '#ff4900';
            btnCancel.addEventListener('click', ()=>{overoverlay.parentNode.removeChild(overoverlay);});
            overoverlay.appendChild(btnOk);
            overoverlay.appendChild(btnCancel);
          });
        });
        break;
    }
  }
};

const cookies = {
  set : function(cname, cvalue, exdays) {
      var d = new Date();
      d.setTime(d.getTime() + (exdays*24*60*60*1000));
      var expires = "expires="+ d.toUTCString();
      document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  },
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

function stringToMinutes(string) {
  s = string.split(':');
  return (parseInt(s[0]) * 60) + parseInt(s[1]);
}

function minutesToString(minutes) {
  return formatNumber(Math.floor(minutes / 60), 2) + ':' + formatNumber(minutes % 60, 2);
}

function formatNumber(number, places) {
  let s = number.toString();
  while (s.length < places)
    s = "0" + s;
  return s;
}

function strf() {
  let s = arguments[0];
  for (let i = 1; i < arguments.length; i++)
    s = s.replace("%s", arguments[i]);
  return s;
}

function save(){
  cookies.set('timeTracker', JSON.stringify(saved_data), 355000);
}

function load(){
  let c = cookies.get('timeTracker');
  if (c.trim().length == 0)
    return;
  saved_data = JSON.parse(c);
}

function generateTable(year, month) {
  console.log(`Generating ${month} of ${year}`);
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
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  for (let day = 1; day <= daysInMonth; day++) {
    let upperPos = lineHeight * day;
    ctx.fillText(formatNumber(day, 2), 0, upperPos);
    ctx.beginPath();
    ctx.moveTo(0, upperPos + lineGap);
    ctx.lineTo(canvas.width, upperPos + lineGap);
    ctx.stroke();
    if ((year in saved_data['events']) && (month in saved_data['events'][year]) && (day in saved_data['events'][year][month])) {
      for (let event of saved_data['events'][year][month][day]) {
        ctx.fillStyle = saved_data['categories'][event['c']];
        ctx.fillRect(textWidth + event['s'], upperPos - lineHeight, event['e'] - event['s'], lineHeight);
      }
    }
  }
  ctx.beginPath();
  ctx.moveTo(textWidth, 0);
  ctx.lineTo(textWidth, canvas.height);
  ctx.stroke();
}

// window.onload = app.onDeviceReady();
// app.initialize();
app.onDeviceReady();
