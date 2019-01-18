(function() {
  if (window.hasRun) {
    // console.log('backend already had run, skip back script');
    return;
  }

  function readFromStorage() {
    return new Promise((resolve, reject) => {
      browser.tabs
        .query({
          active: true,
          currentWindow: true,
        })
        .then(tabs => {
          return browser.storage.local.get(trimmedUrl(tabs[0].url));
        })
        .then(storedInfo => {
          if (Object.values(storedInfo).length) {
            // console.log(
            //   '​readFromStorage -> storedInfo present',
            //   JSON.stringify(storedInfo),
            // );

            let w = Object.values(storedInfo)[0].w || 0;
            let st = Object.values(storedInfo)[0].visible || false;
            stateModule.setWidth(w);
            stateModule.setState(st);
          } else {
            // console.log('no storage read?');
            reject();
          }
        })
        .then(() => {
          resolve();
        })
        .catch(error => console.error(error));
    });
  }

  function writeToStorage(url, vis, wid) {
    browser.storage.local.get(url).then(storedInfo => {
      if (Object.values(storedInfo).length !== 0) {
        Object.assign(storedInfo[url], { visible: vis });
        if (wid) {
          Object.assign(storedInfo[url], { w: wid });
        }
        browser.storage.local.set(storedInfo);
        // .then(
        //   () =>
        //     console.log('Wrote to storage: ' + JSON.stringify(storedInfo)),
        //   onError,
        // );
      } else {
        // console.log('no storage read');
        let toStore = { [url]: { w: wid, visible: true } };

        browser.storage.local.set(toStore);
        // .then(
        //   () =>
        //     console.log(
        //       ' clean wrote to storage: ' + JSON.stringify(toStore),
        //     ),
        //   onError,
        // );
        stateModule.setState(true);
      }
    });
  }

  let stateModule = (function() {
    let state = false;
    let width = 0;
    let pub = {};
    pub.setState = function(newState) {
      // console.log(
      //   'back: stateModule: state change from   ' +
      //     state +
      //     '   to  ' +
      //     newState,
      // );
      state = newState;
    };
    pub.getState = function() {
      return state;
    };
    pub.setWidth = function(newWidth) {
      // console.log(
      //   'back: stateModule:  setWidth() change from   ' +
      //     JSON.stringify(width) +
      //     '   to  ' +
      //     JSON.stringify(newWidth),
      // );
      if (!isNaN(newWidth)) {
        width = newWidth;
      } else {
        width = 2;
        // console.log('setwidth tried to set to NaN');
      }
    };
    pub.getWidth = function() {
      // console.log('back: stateModule: getWidth() from state ' + width);
      return width;
    };
    return pub;
  })();

  function calcNewWidth(w, x) {
    if (x == 0) {
      return 0;
    }
    w += 100 * x;
    let result = w < 0 ? 0 : w;
    result = result > 4000 ? 4000 : result;
    return result;
  }

  function onError(error) {
    console.error(`Error: ${error}`);
  }

  function sendToContent(w) {
    getActiveTab().then(tabs => {
      browser.tabs
        .sendMessage(tabs[0].id, {
          command: 'insert',
          modifier: w,
        })
        .catch(onError);
    });
  }

  function initContentScr() {
    // console.log('​initContentScr -> initContentScr');
    browser.tabs.executeScript({ file: '/content_scripts/content.js' });
  }

  function changeWidth(x) {
    // console.log('changeW direction ' + x);
    let newW = 0;
    newW = calcNewWidth(stateModule.getWidth(), x);
    stateModule.setWidth(newW);
    stateModule.setState(true); /*?*/
    return newW;
  }

  function trimmedUrl(u) {
    return u.match(
      /^(http:\/\/|https:\/\/)?([a-z0-9][a-z0-9-]*\.)+[a-z0-9][a-z0-9-]+\//,
    )[0];
  }
  function getActiveTab() {
    // return browser.tabs.query({ active: true, currentWindow: true });
    return browser.tabs.query({ active: true, currentWindow: true });
  }
  // function onUpda() {}
  // function onActiv() {
  //   // console.log('back: onActiv  ');
  // }
  // browser.tabs.onUpdated.addListener(onUpda);
  // browser.tabs.onActivated.addListener(onActiv);

  // function handleActivated(activeInfo) {
  //   console.log('Tab ' + activeInfo.tabId + ' was activated');
  // }

  function handleUpdated(tabId, changeInfo) {
    if (changeInfo.url) {
      stateModule.setState(false);

      // console.log(
      //   '===========onUpdated: handleUpdated: ' +
      //     tabId +
      //     ' URL changed to ' +
      //     changeInfo.url,
      // );
      readFromStorage().then(() => {
        if (stateModule.getState()) {
          initContentScr();
        }
      });
    }
  }
  browser.tabs.onUpdated.addListener(handleUpdated);
  // browser.tabs.onActivated.addListener(handleActivated);

  //popup and content messages listeners

  browser.runtime.onMessage.addListener(message => {
    getActiveTab().then(tabs => {
      let acTab = trimmedUrl(tabs[0].url);

      // console.log(`back: message received: "${JSON.stringify(message)}"`);

      if (message.command === 'ready') {
        // console.log('back: call initContentScr*() once on ready ');

        if (stateModule.getState()) {
          sendToContent(stateModule.getWidth());
        }
      } else if (message.command === 'change') {
        initContentScr();

        let newW = changeWidth(message.modifier);
        stateModule.setWidth(newW);
        stateModule.setState(true);
        sendToContent(newW);
        writeToStorage(acTab, true, newW);
      } else if (message.command === 'reset') {
        browser.tabs.sendMessage(tabs[0].id, {
          command: 'reset',
        });
      } else if (message.command === 'toggle') {
        let state = stateModule.getState();
        initContentScr();
        browser.tabs.sendMessage(tabs[0].id, {
          command: 'toggleClass',
        });
        stateModule.setState(!state);
        writeToStorage(acTab, !state);
      }
    });
  });

  //Hotkeys listeners

  browser.commands.onCommand.addListener(command => {
    let state = stateModule.getState();
    browser.tabs.executeScript({ file: '/content_scripts/content.js' });

    getActiveTab().then(tabs => {
      let acTab = tabs[0].url;

      if (command == 'toggle') {
        initContentScr();

        browser.tabs.sendMessage(tabs[0].id, {
          command: 'toggleClass',
        });
        writeToStorage(acTab, !state);
        stateModule.setState(!state);

        // console.log(state + ' state after toggle hotkey');
      } else if (command == 'wider') {
        let newW = changeWidth(1);
        sendToContent(newW);
        writeToStorage(acTab, true, newW);
      } else if (command == 'narrower') {
        let newW = changeWidth(-1);
        sendToContent(newW);
        writeToStorage(acTab, true, newW);
      }
    });
  });
  // console.log('back.js end');
})();
