(function() {
  if (window.hasRun) {
    // console.log('popup already had run, skip ');
    return;
  }
  // window.onload = function() {
  //   console.log('loaded popup script');
  // };

  function getActiveTab() {
    return browser.tabs.query({ active: true, currentWindow: true });
  }

  function sendToBack(x) {
    getActiveTab().then(() => {
      browser.runtime.sendMessage(x);
    }, onError);
    // console.log(
    //   `popup: message "change": ${JSON.stringify(x)} sent from the popup`,
    // );
  }

  function listenForClicks() {
    document.addEventListener('click', e => {
      function getModifier(x) {
        switch (x) {
          case 'ON/OFF':
            return 0;
          case '+':
            return 1;
          case '–':
            return -1;
        }
      }

      function modify(tabs) {
        let modifier = 0;
        modifier = getModifier(e.target.textContent);
        sendToBack({
          command: 'change',
          modifier: modifier,
          url: tabs[0].url, //czy potrzebne?
        });
      }

      if (e.target.classList.contains('change')) {
        getActiveTab()
          .then(modify)
          .catch(onError);
      } else if (e.target.classList.contains('toggle')) {
        getActiveTab()
          .then(sendToBack({ command: 'toggle' }))
          .catch(onError);
      }
    });
  }

  document.addEventListener('wheel', e => {
    let dir = e.deltaY;
    // console.log(dir + ' wheel');
    if (dir < 0) {
      sendToBack({ command: 'change', modifier: 1 });
    } else {
      sendToBack({ command: 'change', modifier: -1 });
    }
  });

  function onError(error) {
    console.error(`Error: ${error}`);
  }
  listenForClicks();
})();
