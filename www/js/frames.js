const Frames = {

  /**
   * overlay_create - creates overlay DOM and returns it
   *
   * @param {bool} animate if set to true, the comming of this overlay will be animated
   * @param {bool} closeable if set to true, user can close this overlay by pressing the back button
   * @return {DOM}  overlay added to the body
   */
  overlay_create: function(animate = true, closeable = true) {
    let overlay = document.createElement('div');
    overlay.className = 'overlay';
    if (animate)
      overlay.className += '';

    document.body.appendChild(overlay);

    if (closeable) {
      overlay.dataset.backButtonActionIndex = Math.max(0, ...Object.keys(backButtonActions)) + 1;

      backButtonActions[overlay.dataset.backButtonActionIndex] = () => {
        Frames.overlay_destroy(overlay);
      }
    }

    document.body.scrollLeft = 0;
    document.body.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.documentElement.scrollTop = 0;

    return overlay;
  },


  /**
   * overlay_destroy - destroys overlay
   *
   * @param  {type} overlay description
   * @return {type}         description
   */
  overlay_destroy: function(overlay) {
    overlay.classList.remove('overlayFadeIn');
    overlay.classList.add('overlayFadeOut');
    overlay.style.animation = 'none';
    overlay.offsetHeight;
    overlay.style.animation = null;
    setTimeout(() => {
      overlay.parentNode.removeChild(overlay);
    }, 1500);
    delete backButtonActions[overlay.dataset.backButtonActionIndex];
  },

  processingShow: (text='')=>{
    const overlayID = 'processingOverlay';
    let loadingBar = document.querySelector('#'+overlayID);
    if (loadingBar !== null)
      processingHide();
    loadingBar = Frames.overlay_create(animate=false, closeable=false);
    loadingBar.id = overlayID;

    let rotatingCircle = document.createElement('span');
    rotatingCircle.textContent = 'donut_large';
    rotatingCircle.classList.add('material-icons');
    rotatingCircle.style.fontSize = '20vh';
    rotatingCircle.style.animation = 'rotationCircle 1s ease 0s infinite normal';

    let shownText = document.createElement('span');
    shownText.textContent = text;
    loadingBar.appendChild(shownText);
    loadingBar.appendChild(rotatingCircle);
  },

  processingHide: ()=>{
    const overlayID = 'processingOverlay';
    let loadingBar = document.querySelector('#'+overlayID);
    if (loadingBar !== null)
        Frames.overlay_destroy(loadingBar);
  },

  /**
   * new_record - shows frame for adding new record
   *
   * @return {type}  undefined
   */
  new_record: function() {
    let overlay = Frames.overlay_create();

    let dateData = document.querySelector('#shownDate').value.split('-'); // yyyy-mm-dd format
    for (let i = 0; i < dateData.length; i++)
      dateData[i] = parseInt(dateData[i]).toString();

    let year = dateData[0];
    let month = dateData[1];
    let day = dateData[2];
    if (!(year in online_data['events']))
      online_data['events'][year] = {};
    if (!(month in online_data['events'][year]))
      online_data['events'][year][month] = {};

    let timeStart = 0;
    if (!(day in online_data['events'][year][month]))
      online_data['events'][year][month][day] = [];
    else
      for (let event of online_data['events'][year][month][day])
        if (event['e'] > timeStart)
          timeStart = event['e'];

    let overlayText = document.createElement('div');
    overlayText.innerHTML = `What were you doing from <input id='inputStart' type="time" value="${minutesToString(timeStart)}"> to <input id='inputEnd' type="time" value="${minutesToString(Math.min(timeStart + online_data['defaultEventMinutes'], minutesInDay - 1))}">?`;
    overlay.appendChild(overlayText);

    function createCategoryButton(category) {
      let categoryBtn = document.createElement('button');
      categoryBtn.className = 'button';
      categoryBtn.style.background = online_data['categories'][category];
      categoryBtn.innerHTML = category;
      categoryBtn.addEventListener('click', () => {
        let inputStart = document.querySelector('#inputStart');
        let inputEnd = document.querySelector('#inputEnd');
        let newEvent = {
          's': stringToMinutes(inputStart.value),
          'e': stringToMinutes(inputEnd.value),
          'c': category
        };
        let undoTimeout = 7;
        let undoCopy = online_data['events'][year][month][day].slice();
        Frames.btnUndoShow(() => {
          online_data['events'][year][month][day] = undoCopy;
          save();
          generateTable(year, month, day);
        }, undoTimeout);
        online_data['events'][year][month][day].push(newEvent);
        compressDay(year, month, day);
        Frames.overlay_destroy(overlay);
        save();
        generateTable(year, month, day);
      });
      overlay.appendChild(categoryBtn);
    }
    for (let category of Object.keys(online_data['categories']))
      createCategoryButton(category);
    let newCategoryBtn = document.createElement('button');
    newCategoryBtn.className = 'button';
    newCategoryBtn.textContent = '+';
    overlay.appendChild(newCategoryBtn);
    newCategoryBtn.addEventListener('click', () => {
      Frames.new_category(createCategoryButton);
    });
  },

  /**
   * more_options - shows extend settings frame
   *
   * @return {undefined}
   */
  more_options: function() {
    let overlay = Frames.overlay_create();

    let overlayBtns = [];
    let btnSyncSetup = document.createElement('button');
    btnSyncSetup.className = 'button';
    btnSyncSetup.textContent = 'Setup sync';
    btnSyncSetup.addEventListener('click', () => {
      Frames.sync_setup();
    });
    overlayBtns.push(btnSyncSetup);

    let btnServerPull = document.createElement('button');
    btnServerPull.className = 'button';
    btnServerPull.textContent = 'Pull server data';
    btnServerPull.addEventListener('click', () => {
      Frames.processingShow("Pulling data from server");
      Server.pull((data) => {
        online_data = JSON.parse(data);
        save();
        paintToday();
      });
      Frames.processingHide();
    });
    overlayBtns.push(btnServerPull);

    let btnAutofillSleep = document.createElement('button');
    btnAutofillSleep.className = 'button';
    btnAutofillSleep.textContent = 'Autofill sleep';
    btnAutofillSleep.addEventListener('click', () => {
      Frames.processingShow("Autofilling sleep");
      let unfinishedDays = [];
      let finishingTime = minutesInDay - 1;
      for (let year of Object.keys(online_data['events']))
        for (let month of Object.keys(online_data['events'][year]))
          for (let day of Object.keys(online_data['events'][year][month])) {
            let dayFinished = false;
            for (let event of online_data['events'][year][month][day])
              if (event['e'] >= finishingTime) {
                dayFinished = true;
                break;
              }
            if (!dayFinished)
              unfinishedDays.push({
                'y': year,
                'm': month,
                'd': day
              });
          }
      for (let date of unfinishedDays) {
        let tommorowDate = new Date(new Date(date['y'], date['m'] - 1, date['d']).getTime() + (24 * 3600 * 1000));
        let tommorowYear = tommorowDate.getFullYear();
        let tommorowMonth = tommorowDate.getMonth() + 1;
        let tommorowDay = tommorowDate.getDate();
        let tommorowStartsWithSleep = false;
        if ((tommorowYear in online_data['events']) && (tommorowMonth in online_data['events'][tommorowYear]) && (tommorowDay in online_data['events'][tommorowYear][tommorowMonth]))
          for (let event of online_data['events'][tommorowYear][tommorowMonth][tommorowDay])
            if ((event['s'] === 0) && (event['c'] === online_data['sleepCategory'])) {
              tommorowStartsWithSleep = true;
              break;
            }
        if (!tommorowStartsWithSleep)
          continue;
        let sleepTime = 0;
        for (let event of online_data['events'][date['y']][date['m']][date['d']])
          if (event['e'] > sleepTime)
            sleepTime = event['e'];
        if (sleepTime < stringToMinutes("18:00")) // nobody goes to sleep before 6PM
          continue;
        online_data['events'][date['y']][date['m']][date['d']].push({
          's': sleepTime,
          'e': finishingTime,
          'c': online_data['sleepCategory']
        });
        compressDay(date['y'], date['m'], date['d']);
      }
      save();
      Frames.processingHide();
      let dateData = shownDate.value.split('-'); // yyyy-mm-dd format
      generateTable(parseInt(dateData[0]), parseInt(dateData[1]), parseInt(dateData[2]), offline_data['daysToShow']);
    });
    overlayBtns.push(btnAutofillSleep);

    for (let btn of overlayBtns) {
      overlay.appendChild(btn);
      btn.addEventListener('click', () => {
        Frames.overlay_destroy(overlay);
      });
    }
  },

  /**
   * sync_setup - shows frame for adjusting sync settings
   *
   * @return {undefined}
   */
  sync_setup: function() {
    let overlay = Frames.overlay_create();

    overlay.innerHTML = '<input type="text" id="onlineURL" placeholder="online server url"></input><input type="text" id="onlineUsername" placeholder="account name"></input>';
    let txtUsername = document.querySelector('#onlineUsername');
    let txtServer = document.querySelector('#onlineURL');
    if ('account' in offline_data)
      txtUsername.value = offline_data['account'];
    if ('server' in offline_data)
      txtServer.value = offline_data['server'];
    let btnSave = document.createElement('button');
    btnSave.className = 'button';
    btnSave.textContent = 'Save';
    btnSave.addEventListener('click', () => {
      offline_data['account'] = txtUsername.value;
      offline_data['server'] = txtServer.value;
      save();
      Frames.overlay_destroy(overlay);
    });

    let btnCancel = document.createElement('button');
    btnCancel.className = 'button';
    btnCancel.textContent = 'Cancel';
    btnCancel.addEventListener('click', () => {
      Frames.overlay_destroy(overlay);
    });

    overlay.appendChild(btnSave);
    overlay.appendChild(btnCancel)
  },


  /**
   * new_category - shows frame for creating new category
   *
   * @param  {function} function_create_button this function is called when user confirms creating new category
   * @return {undefined}
   */
  new_category: function(function_create_button) {
    /*
    Show dialog for creatting new category
    */
    let overoverlay = Frames.overlay_create();

    document.body.appendChild(overoverlay);
    overoverlay.innerHTML = `<div class="button" style="display:flex; flex-direction: row; height: 30vh;">
          <input type="color" style="flex-grow: 1; height: 100%; min-width: 20%" id="catColor">
          <input type="text" placeholder="Category name"  style="flex-grow: 3; height: 100%; font-size: 5vh;" id="catName">
        </div>`;
    let btnOk = document.createElement('button');
    btnOk.className = 'button';
    btnOk.innerHTML = 'save';
    btnOk.style.background = '#2b5e42';
    btnOk.addEventListener('click', () => {
      let newCategory = document.querySelector('#catName').value;
      if (newCategory.trim().length == 0) {
        alert('Category name should not be empty');
        return;
      }
      if (newCategory in online_data['categories']) {
        alert('This category already exists');
        return;
      }
      online_data['categories'][newCategory] = document.querySelector('#catColor').value;
      function_create_button(newCategory);
      Frames.overlay_destroy(overoverlay);
      save();
    });
    let btnCancel = document.createElement('button');
    btnCancel.className = 'button';
    btnCancel.innerHTML = 'cancel';
    btnCancel.style.background = '#ff4900';
    btnCancel.addEventListener('click', () => {
      Frames.overlay_destroy(overoverlay);
    });
    overoverlay.appendChild(btnOk);
    overoverlay.appendChild(btnCancel);
  },


  /**
   * btnUndoShow - shows undo button that can do something
   *
   * @param  {function} undoFunction function triggered upon button press
   * @param  {number} ttl=0        if set to larger than 0, tells us how many second the button lasts before disappearing
   * @return {undefined}
   */
  btnUndoShow: function(undoFunction, ttl = 0) {
    if (document.querySelector('#btnUndo') !== null) {
      Frames.btnUndoHide(document.querySelector('#btnUndo'));
    }

    let undoButton = document.createElement('span');
    undoButton.id = 'btnUndo';
    undoButton.className = 'button material-icons btnUndo';
    undoButton.textContent = 'undo';
    undoButton.addEventListener('click', () => {
      Frames.btnUndoHide(undoButton)
    });
    undoButton.addEventListener('click', undoFunction);
    document.body.appendChild(undoButton);

    if (ttl > 0)
      setTimeout(() => {
        Frames.btnUndoHide(undoButton)
      }, 1000 + (ttl * 1000));
  },


  /**
   * btnUndoHide - Hides undo button
   *
   * @param  {DOM} dom=null if set, removes this instance of btnUndo
   * @return {undefined}
   */
  btnUndoHide: function(dom = null) {
    if (dom == null) {
      dom = document.querySelector('#btnUndo');
      if (dom == null)
        return;
    }
    if (dom.id !== 'btnUndo')
      return;
    let new_dom = dom.cloneNode(true);
    dom.parentNode.replaceChild(new_dom, dom);
    new_dom.id = '';
    new_dom.style.animation = 'btnUndoFlowsOut 1s';
    new_dom.style.animationFillMode = 'forwards';
    setTimeout(() => {
      new_dom.parentNode.removeChild(new_dom);
    }, 10000);
  },

  /**
   * btnShow - animates fade in of a button
   *
   * @param  {DOM} dom button DOM
   * @return {undefined}
   */
  btnShow: function(dom) {
    if (((' ' + dom.className + ' ').indexOf(' buttonDisappearAnimation ') === -1) && ((' ' + btnJumpToToday.className + ' ').indexOf(' buttonAppearAnimation ') !== -1))
      return;
    dom.classList.remove('buttonDisappearAnimation');
    dom.classList.add('buttonAppearAnimation');
    dom.style.animation = 'none';
    dom.offsetHeight;
    dom.style.animation = null;

  },


  /**
   * btnHide - animates fade out of a button
   *
   * @param  {DOM} dom button DOM
   * @return {undefined}
   */
  btnHide: function(dom) {
    if (((' ' + btnJumpToToday.className + ' ').indexOf(' buttonAppearAnimation ') === -1) && ((' ' + dom.className + ' ').indexOf(' buttonDisappearAnimation ') !== -1))
      return;
    dom.classList.remove('buttonAppearAnimation');
    dom.classList.add('buttonDisappearAnimation');
    dom.style.animation = 'none';
    dom.offsetHeight;
    dom.style.animation = null;
  }
}
