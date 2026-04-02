(function() {
  var shopId = document.currentScript.getAttribute('data-shop-id');
  if (!shopId) {
    console.error('Replybase: data-shop-id attribute is required');
    return;
  }

  var host = document.currentScript.src.replace('/embed.js', '');

  // Create container
  var container = document.createElement('div');
  container.id = 'replybase-widget';
  container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;';

  // Create toggle button
  var btn = document.createElement('button');
  btn.id = 'replybase-toggle';
  btn.innerHTML = '💬';
  btn.style.cssText = 'width:60px;height:60px;border-radius:50%;border:none;background:#4F46E5;color:white;font-size:24px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 0.2s;';
  btn.onmouseover = function() { btn.style.transform = 'scale(1.1)'; };
  btn.onmouseout = function() { btn.style.transform = 'scale(1)'; };

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.src = host + '/widget/' + shopId;
  iframe.style.cssText = 'width:380px;height:520px;border:none;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);display:none;margin-bottom:12px;';
  iframe.allow = 'clipboard-write';

  var isOpen = false;
  btn.onclick = function() {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? 'block' : 'none';
    btn.innerHTML = isOpen ? '✕' : '💬';
  };

  container.appendChild(iframe);
  container.appendChild(btn);
  document.body.appendChild(container);
})();
