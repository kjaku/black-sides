(function() {
  // console.log('content:  script start');

  /**
   * Check and set a global guard variable.
   * If this content script is injected into the same page again,
   * it will do nothing next time.
   */
  if (window.hasRun) {
    // console.log('content: already had run, skip content script');
    return;
  }
  window.hasRun = true;
  if (!document.getElementById('dimu')) {
    let dimDiv = document.createElement('div');
    dimDiv.id = 'dimu';
    dimDiv.className = 'dim';
    dimDiv.style.position = 'fixed';
    dimDiv.style.pointerEvents = 'none';
    dimDiv.style.top = 0;
    dimDiv.style.left = 0;
    dimDiv.style.width = '100%';
    dimDiv.style.height = '100vh';
    dimDiv.style.zIndex = '-1000';
    dimDiv.style.boxSizing = 'border-box';
    // dimDiv.style.borderLeft = `20px solid red`;
    // dimDiv.style.borderRight = `20px solid red`;
    document.body.appendChild(dimDiv);
    // console.log('content:  start div created');
  }

  function changeDiv(w) {
    // console.log('content: change div prop ' + JSON.stringify(w));
    let dimDiv = document.getElementById('dimu');
    dimDiv.style.display = 'block';
    let color = 'rgba(0,0,0,1)';
    dimDiv.style.borderLeft = `${w}px solid ${color}`;
    dimDiv.style.borderRight = `${w}px solid ${color}`;
  }

  function toggleDimmerClass() {
    // console.log('toggle visibility of div');
    if (document.getElementById('dimu')) {
      let dimmer = document.getElementById('dimu');

      dimmer.style.display = dimmer.style.display === 'none' ? 'block' : 'none';
      // dimmer.parentNode.removeChild(dimmer);
      let visible = dimmer.style.display === 'none' ? false : true;

      browser.runtime.sendMessage({
        visibility: visible,
      });
      // console.log('class visibility message: ' + visible);
    }
  }

  browser.runtime.onMessage.addListener(message => {
    // console.log('content: message  received in content');

    if (message.command === 'insert') {
      changeDiv(message.modifier);
    } else if (message.command === 'toggleClass') {
      toggleDimmerClass();
    } else if (message.command === 'change') {
      // console.log('content: message "change" received in content');
    }
    return Promise.resolve({
      response: '$Response from content script send message',
    });
  });
  //content script ready message
  browser.runtime.sendMessage({
    command: 'ready',
  });
})();
