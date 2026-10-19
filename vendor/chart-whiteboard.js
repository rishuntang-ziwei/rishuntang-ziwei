(function () {
  const MAIN_STARS = [
    '紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府',
    '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
  ]

  const state = {
    active: false,
    mode: 'draw',
    tool: 'pen',
    color: '#d32f2f',
    drawing: false,
    dragCard: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    floatEl: null,
  }

  let ui = null
  let canvas = null
  let ctx = null

  function getChartOuter() {
    return document.querySelector('#chartView .chart-outer')
  }

  function updateToggleButton() {
    const btn = document.getElementById('chartWhiteboardBtn')
    if (!btn) return
    btn.classList.toggle('is-active', state.active)
    btn.textContent = state.active ? '關閉電子白板' : '電子白板'
  }

  function ensureUi() {
    if (ui) return ui
    const panel = document.getElementById('chartPanel')
    if (!panel) return null

    const wrap = document.createElement('div')
    wrap.id = 'chartWhiteboardUi'
    wrap.className = 'chart-wb-ui hidden'
    wrap.innerHTML =
      '<div class="chart-wb-toolbar" role="toolbar" aria-label="電子白板工具">' +
        '<div class="chart-wb-group">' +
          '<button type="button" class="chart-wb-btn is-active" data-wb-mode="draw">繪圖</button>' +
          '<button type="button" class="chart-wb-btn" data-wb-mode="drag">拖曳</button>' +
        '</div>' +
        '<div class="chart-wb-group">' +
          '<button type="button" class="chart-wb-btn is-active" data-wb-tool="pen">書寫筆</button>' +
          '<button type="button" class="chart-wb-btn" data-wb-tool="highlighter">螢光筆</button>' +
          '<button type="button" class="chart-wb-btn" data-wb-tool="eraser">橡皮擦</button>' +
        '</div>' +
        '<div class="chart-wb-group chart-wb-colors">' +
          '<button type="button" class="chart-wb-color is-active" data-color="#d32f2f" style="background:#d32f2f"></button>' +
          '<button type="button" class="chart-wb-color" data-color="#1a237e" style="background:#1a237e"></button>' +
          '<button type="button" class="chart-wb-color" data-color="#212121" style="background:#212121"></button>' +
          '<button type="button" class="chart-wb-color" data-color="#2e7d32" style="background:#2e7d32"></button>' +
        '</div>' +
        '<button type="button" class="chart-wb-btn chart-wb-clear" data-wb-clear>清除手寫</button>' +
        '<p class="chart-wb-hint" id="chartWbHint">繪圖模式：在命盤上書寫；切換拖曳可放置主星文字卡</p>' +
      '</div>' +
      '<aside class="chart-wb-deck" aria-label="主星文字卡">' +
        '<div class="chart-wb-deck-title">14 主星</div>' +
        '<div class="chart-wb-deck-list" id="chartWbDeck"></div>' +
      '</aside>'

    panel.insertBefore(wrap, panel.firstChild)

    const deck = wrap.querySelector('#chartWbDeck')
    MAIN_STARS.forEach(function (name) {
      deck.appendChild(createTextCard(name, true))
    })

    wrap.querySelectorAll('[data-wb-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setInteractionMode(btn.dataset.wbMode)
      })
    })
    wrap.querySelectorAll('[data-wb-tool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setTool(btn.dataset.wbTool)
      })
    })
    wrap.querySelectorAll('.chart-wb-color').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setColor(btn.dataset.color)
      })
    })
    wrap.querySelector('[data-wb-clear]').addEventListener('click', clearCanvas)

    ui = wrap
    return ui
  }

  function createTextCard(name, bindDrag) {
    const card = document.createElement('div')
    card.className = 'chart-wb-text-card'
    card.dataset.starName = name
    card.textContent = name
    if (bindDrag) card.addEventListener('pointerdown', onCardPointerDown)
    return card
  }

  function mountCanvas(snapshot) {
    const outer = getChartOuter()
    if (!outer) return false
    if (getComputedStyle(outer).position === 'static') outer.style.position = 'relative'

    const existing = outer.querySelector('#chartWhiteboardCanvas')
    if (existing) existing.remove()

    canvas = document.createElement('canvas')
    canvas.id = 'chartWhiteboardCanvas'
    canvas.className = 'chart-wb-canvas'
    outer.appendChild(canvas)
    ctx = canvas.getContext('2d')
    resizeCanvas()
    bindCanvasEvents()

    if (snapshot) restoreSnapshot(snapshot)
    syncCanvasPointer()
    return true
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return
    const outer = getChartOuter()
    if (!outer) return
    const rect = outer.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const snap = captureSnapshot()

    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (snap) restoreSnapshot(snap)
  }

  function captureSnapshot() {
    if (!canvas || !canvas.width) return null
    try {
      return canvas.toDataURL('image/png')
    } catch (_) {
      return null
    }
  }

  function restoreSnapshot(dataUrl) {
    if (!dataUrl || !ctx || !canvas) return
    const img = new Image()
    img.onload = function () {
      const rect = getChartOuter().getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.drawImage(img, 0, 0, rect.width, rect.height)
    }
    img.src = dataUrl
  }

  window.captureChartWhiteboardSnapshot = captureSnapshot

  function syncCanvasPointer() {
    if (!canvas) return
    canvas.classList.toggle('is-pass-through', state.active && state.mode !== 'draw')
  }

  function setInteractionMode(mode) {
    state.mode = mode
    if (!ui) return
    ui.querySelectorAll('[data-wb-mode]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.wbMode === mode)
    })
    const hint = document.getElementById('chartWbHint')
    if (hint) {
      hint.textContent = mode === 'draw'
        ? '繪圖模式：在命盤上書寫；切換拖曳可放置主星文字卡'
        : '拖曳模式：將主星文字卡拖入宮位（可點擊命盤切換三方四正）'
    }
    syncCanvasPointer()
  }

  function setTool(tool) {
    state.tool = tool
    if (!ui) return
    ui.querySelectorAll('[data-wb-tool]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.wbTool === tool)
    })
  }

  function setColor(color) {
    state.color = color
    if (state.tool === 'eraser') setTool('pen')
    if (!ui) return
    ui.querySelectorAll('.chart-wb-color').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.color === color)
    })
  }

  function canvasPoint(evt) {
    const rect = canvas.getBoundingClientRect()
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top }
  }

  function applyStrokeStyle() {
    if (state.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = 28
      ctx.globalAlpha = 1
      return
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = state.color
    if (state.tool === 'highlighter') {
      ctx.lineWidth = 22
      ctx.globalAlpha = 0.35
    } else {
      ctx.lineWidth = 3
      ctx.globalAlpha = 1
    }
  }

  function onDrawStart(evt) {
    if (!state.active || state.mode !== 'draw') return
    if (evt.pointerType === 'mouse' && evt.button !== 0) return
    state.drawing = true
    const pt = canvasPoint(evt)
    canvas.setPointerCapture(evt.pointerId)
    applyStrokeStyle()
    ctx.beginPath()
    ctx.moveTo(pt.x, pt.y)
    evt.preventDefault()
  }

  function onDrawMove(evt) {
    if (!state.drawing || !state.active || state.mode !== 'draw') return
    const pt = canvasPoint(evt)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    evt.preventDefault()
  }

  function onDrawEnd(evt) {
    if (!state.drawing) return
    state.drawing = false
    try { canvas.releasePointerCapture(evt.pointerId) } catch (_) { /* ignore */ }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  function clearCanvas() {
    if (!confirm('確定清除所有手寫內容？')) return
    const outer = getChartOuter()
    if (!outer || !ctx) return
    const rect = outer.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
  }

  function bindCanvasEvents() {
    if (!canvas || canvas.dataset.wbBound) return
    canvas.dataset.wbBound = '1'
    canvas.addEventListener('pointerdown', onDrawStart)
    canvas.addEventListener('pointermove', onDrawMove)
    canvas.addEventListener('pointerup', onDrawEnd)
    canvas.addEventListener('pointercancel', onDrawEnd)
  }

  function onCardPointerDown(evt) {
    if (!state.active || state.mode !== 'drag') return
    if (evt.button !== 0 && evt.pointerType === 'mouse') return
    const card = evt.currentTarget
    state.dragCard = card
    card.classList.add('is-dragging')
    card.setPointerCapture(evt.pointerId)
    const rect = card.getBoundingClientRect()
    state.dragOffsetX = evt.clientX - rect.left
    state.dragOffsetY = evt.clientY - rect.top
    state.floatEl = card.cloneNode(true)
    state.floatEl.classList.add('chart-wb-float-card')
    document.body.appendChild(state.floatEl)
    moveFloatCard(evt.clientX, evt.clientY)
    evt.preventDefault()
  }

  function moveFloatCard(x, y) {
    if (!state.floatEl) return
    state.floatEl.style.left = x - state.dragOffsetX + 'px'
    state.floatEl.style.top = y - state.dragOffsetY + 'px'
  }

  function dropPalaceAt(x, y) {
    if (state.floatEl) state.floatEl.hidden = true
    const el = document.elementFromPoint(x, y)
    if (state.floatEl) state.floatEl.hidden = false
    return el && el.closest('.palace')
  }

  function onGlobalPointerMove(evt) {
    if (!state.dragCard) return
    moveFloatCard(evt.clientX, evt.clientY)
    document.querySelectorAll('.palace.is-drop-target').forEach(function (p) {
      p.classList.remove('is-drop-target')
    })
    const palace = dropPalaceAt(evt.clientX, evt.clientY)
    if (palace) palace.classList.add('is-drop-target')
  }

  function onGlobalPointerUp(evt) {
    if (!state.dragCard) return
    const card = state.dragCard
    const palace = dropPalaceAt(evt.clientX, evt.clientY)
    document.querySelectorAll('.palace.is-drop-target').forEach(function (p) {
      p.classList.remove('is-drop-target')
    })
    if (palace) {
      const tag = createTextCard(card.dataset.starName, false)
      tag.classList.add('chart-wb-placed-card')
      let slot = palace.querySelector('.chart-wb-placed-wrap')
      if (!slot) {
        slot = document.createElement('div')
        slot.className = 'chart-wb-placed-wrap'
        palace.appendChild(slot)
      }
      slot.appendChild(tag)
    }
    card.classList.remove('is-dragging')
    try { card.releasePointerCapture(evt.pointerId) } catch (_) { /* ignore */ }
    if (state.floatEl) {
      state.floatEl.remove()
      state.floatEl = null
    }
    state.dragCard = null
  }

  window.toggleChartWhiteboard = function (force) {
    const next = typeof force === 'boolean' ? force : !state.active
    if (next && !getChartOuter()) {
      alert('請先完成排盤，再開啟電子白板')
      return
    }

    state.active = next
    document.body.classList.toggle('chart-whiteboard-active', state.active)

    if (state.active) {
      const root = ensureUi()
      if (root) root.classList.remove('hidden')
      mountCanvas()
      setInteractionMode('draw')
      setTool('pen')
      setColor('#d32f2f')
    } else {
      if (ui) ui.classList.add('hidden')
      if (canvas) {
        canvas.remove()
        canvas = null
        ctx = null
      }
    }
    updateToggleButton()
  }

  window.syncChartWhiteboardAfterRender = function (snapshot) {
    if (!state.active) return
    mountCanvas(snapshot || null)
    resizeCanvas()
  }

  window.addEventListener('pointermove', onGlobalPointerMove)
  window.addEventListener('pointerup', onGlobalPointerUp)
  window.addEventListener('pointercancel', onGlobalPointerUp)
  window.addEventListener('resize', function () {
    if (state.active) resizeCanvas()
  })
})()
