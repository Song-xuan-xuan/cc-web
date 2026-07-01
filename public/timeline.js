// Session timeline module for CC-Web.
(function () {
  'use strict';

  function cleanText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function previewText(value, maxLength) {
    const text = cleanText(value);
    if (!text) return '空消息';
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function createSessionTimeline(options) {
    const panel = options.panel;
    const listEl = options.listEl;
    const countEl = options.countEl;
    const previewEl = options.previewEl;
    const messagesEl = options.messagesEl;
    const onNavigate = typeof options.onNavigate === 'function' ? options.onNavigate : () => {};
    const WINDOW_RADIUS = 5;
    let items = [];
    let selectedIndex = null;
    let anchorIndex = null;

    function setEmpty(message) {
      if (!listEl) return;
      listEl.innerHTML = `<div class="timeline-empty">${message}</div>`;
    }

    function renderPreview(item) {
      if (!previewEl) return;
      if (!item) {
        previewEl.hidden = true;
        previewEl.innerHTML = '';
        return;
      }
      previewEl.hidden = false;
      previewEl.innerHTML = `
        <div class="timeline-preview-label">${formatTime(item.timestamp) || `#${item.index + 1}`}</div>
        <div class="timeline-preview-text"></div>
      `;
      const textEl = previewEl.querySelector('.timeline-preview-text');
      if (textEl) textEl.textContent = previewText(item.content, 220);
    }

    function render() {
      if (!panel || !listEl) return;
      const anchor = getAnchorItem();
      const visibleItems = getVisibleItems(anchor);
      if (countEl) countEl.textContent = items.length ? `${visibleItems.length}/${items.length}` : '';
      if (items.length === 0) {
        setEmpty('暂无用户消息');
        renderPreview(null);
        return;
      }

      const frag = document.createDocumentFragment();
      for (const item of visibleItems) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `timeline-item${item.index === selectedIndex ? ' active' : ''}`;
        btn.dataset.messageIndex = String(item.index);
        btn.title = previewText(item.content, 80);
        btn.setAttribute('aria-label', `跳转到用户消息: ${previewText(item.content, 80)}`);

        const dot = document.createElement('span');
        dot.className = 'timeline-dot';
        dot.setAttribute('aria-hidden', 'true');

        const tick = document.createElement('span');
        tick.className = 'timeline-tick';
        tick.setAttribute('aria-hidden', 'true');

        btn.appendChild(dot);
        btn.appendChild(tick);
        btn.addEventListener('mouseenter', () => renderPreview(item));
        btn.addEventListener('focus', () => renderPreview(item));
        btn.addEventListener('mouseleave', () => renderPreview(getSelectedItem()));
        btn.addEventListener('blur', () => renderPreview(getSelectedItem()));
        btn.addEventListener('click', () => select(item.index, { scroll: true }));
        frag.appendChild(btn);
      }

      listEl.innerHTML = '';
      listEl.appendChild(frag);
      renderPreview(items.find((item) => item.index === selectedIndex) || null);
    }

    function getSelectedItem() {
      return items.find((item) => item.index === selectedIndex) || null;
    }

    function getAnchorItem() {
      if (items.length === 0) return null;
      return items.find((item) => item.index === anchorIndex)
        || items.find((item) => item.index === selectedIndex)
        || items[items.length - 1];
    }

    function getVisibleItems(anchor) {
      if (!anchor) return [];
      const anchorPosition = Math.max(0, items.findIndex((item) => item.index === anchor.index));
      let start = Math.max(0, anchorPosition - WINDOW_RADIUS);
      let end = Math.min(items.length, anchorPosition + WINDOW_RADIUS + 1);
      const targetCount = WINDOW_RADIUS * 2 + 1;
      if (end - start < targetCount) {
        if (start === 0) end = Math.min(items.length, targetCount);
        else if (end === items.length) start = Math.max(0, items.length - targetCount);
      }
      return items.slice(start, end);
    }

    function setMessages(messages, options = {}) {
      const baseIndex = Number.isFinite(options.baseIndex) ? options.baseIndex : 0;
      items = (Array.isArray(messages) ? messages : [])
        .map((message, offset) => ({ message, index: baseIndex + offset }))
        .filter((entry) => entry.message && entry.message.role === 'user')
        .map((entry) => ({
          index: entry.index,
          content: entry.message.content || '',
          timestamp: entry.message.timestamp || null,
        }));
      if (!items.some((item) => item.index === selectedIndex)) selectedIndex = null;
      if (!items.some((item) => item.index === anchorIndex)) {
        anchorIndex = selectedIndex ?? items[items.length - 1]?.index ?? null;
      }
      panel.hidden = items.length === 0;
      panel.closest('.chat-body')?.classList.toggle('timeline-enabled', items.length > 0);
      render();
    }

    function select(index, options = {}) {
      selectedIndex = Number(index);
      anchorIndex = selectedIndex;
      render();
      const item = getSelectedItem();
      renderPreview(item);
      if (options.scroll && messagesEl) {
        const target = messagesEl.querySelector(`[data-message-index="${selectedIndex}"]`);
        if (target) {
          onNavigate(selectedIndex, target);
        }
      }
    }

    function clear() {
      items = [];
      selectedIndex = null;
      anchorIndex = null;
      if (panel) panel.hidden = true;
      panel?.closest('.chat-body')?.classList.remove('timeline-enabled');
      setEmpty('暂无用户消息');
      renderPreview(null);
      if (countEl) countEl.textContent = '';
    }

    clear();
    return { setMessages, select, clear };
  }

  window.CCWebTimeline = { createSessionTimeline };
})();
