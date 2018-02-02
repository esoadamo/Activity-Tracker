const Frames = {

  /**
   * new_record - shows frame for adding new record
   *
   * @return {type}  undefined
   */
  new_record: function(){
    let today = new Date();
    let overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    let year = today.getFullYear().toString();
    let month = (today.getMonth() + 1).toString();
    let day = today.getDate();
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
    overlayText.innerHTML = `What were you doing from <input id='inputStart' type="time" value="${minutesToString(timeStart)}"> to <input id='inputEnd' type="time" value="${minutesToString(timeStart + online_data['period'])}">?`;
    overlay.appendChild(overlayText);

    function createCategoryButton(category) {
      let categoryBtn = document.createElement('button');
      categoryBtn.className = 'button';
      categoryBtn.style.background = online_data['categories'][category];
      categoryBtn.innerHTML = category;
      categoryBtn.addEventListener('click', () => {
        let inputStart = document.querySelector('#inputStart');
        let inputEnd = document.querySelector('#inputEnd');
        online_data['events'][year][month][day].push({
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
    let overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    let overlayBtns = [];
    let btnSyncSetup = document.createElement('button');
    btnSyncSetup.className = 'button';
    btnSyncSetup.textContent = 'Setup sync';
    btnSyncSetup.addEventListener('click', () => {
      Frames.sync_setup();
    });
    overlayBtns.push(btnSyncSetup);

    for (let btn of overlayBtns){
    overlay.appendChild(btn);
      btn.addEventListener('click', () => {
        overlay.parentNode.removeChild(overlay);
      });
    }
  },

  /**
   * sync_setup - shows frame for adjusting sync settings
   *
   * @return {undefined}
   */
  sync_setup: function() {
    let overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

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
    btnSave.addEventListener('click', ()=> {
      offline_data['account'] = txtUsername.value;
      offline_data['server'] = txtServer.value;
      save();
      overlay.parentNode.removeChild(overlay);
    });

    let btnCancel = document.createElement('button');
    btnCancel.className = 'button';
    btnCancel.textContent = 'Cancel';
    btnCancel.addEventListener('click', ()=> { overlay.parentNode.removeChild(overlay);});

    overlay.appendChild(btnSave);
    overlay.appendChild(btnCancel)
  },


  /**
   * new_category - shows frame for creating new category
   *
   * @param  {function} function_create_button this function is called when user confirms creating new category
   * @return {undefined}
   */
  new_category: function(function_create_button){
    /*
    Show dialog for creatting new category
    */
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
      overoverlay.parentNode.removeChild(overoverlay);
      save();
    });
    let btnCancel = document.createElement('button');
    btnCancel.className = 'button';
    btnCancel.innerHTML = 'cancel';
    btnCancel.style.background = '#ff4900';
    btnCancel.addEventListener('click', () => {
      overoverlay.parentNode.removeChild(overoverlay);
    });
    overoverlay.appendChild(btnOk);
    overoverlay.appendChild(btnCancel);
  }
}
