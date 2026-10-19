(function () {
  const HISTORY_MAX = 40

  const state = {
    active: false,
    tool: 'pen',
    color: '#d32f2f',
    drawing: false,
    strokeStarted: false,
  }

  let ui = null
  let inkCanvas = null
  let hiCanvas = null
  let inkCtx = null
  let hiCtx = null
  /** @type {string[]} JSON snapshots { ink, hi } */
  let history = []

  function getChartOuter() {
    return document.querySelector('#chartView .chart-outer')
  }

  function updateToggleButton() {
    const btn = document.getElementById('chartWhiteboardBtn')
    if (!btn) return
    btn.classList.toggle('is-active', state.active)
    btn.textContent = state.active ? '關閉電子白板' : '電子白板'
  }

  function updateUndoButton() {
    const btn = ui && ui.querySelector('[data-wb-undo]')
    if (!btn) return
    btn.disabled = history.length <= 1
  }

  function serializeSnapshot() {
    if (!inkCanvas || !hiCanvas) return null
    try {
      return JSON.stringify({
        ink: inkCanvas.toDataURL('image/png'),
        hi: hiCanvas.toDataURL('image/png'),
      })
    } catch (_) {
      return null
    }
  }

  function parseSnapshot(raw) {
    if (!raw) return null
    if (typeof raw === 'string' && raw.charAt(0) === '{') {
      try {
        return JSON.parse(raw)
      } catch (_) {
        return null
      }
    }
    if (typeof raw === 'string') {
      return { ink: raw, hi: null }
    }
    return raw
  }

  function drawLayerFromDataUrl(ctx, canvas, dataUrl, cssW, cssH) {
    if (!dataUrl || !ctx) return Promise.resolve()
    return new Promise(function (resolve) {
      const img = new Image()
      img.onload = function () {
        ctx.clearRect(0, 0, cssW, cssH)
        ctx.drawImage(img, 0, 0, cssW, cssH)
        resolve()
      }
      img.onerror = function () {
        resolve()
      }
      img.src = dataUrl
    })
  }

  function restoreSnapshot(raw) {
    const payload = parseSnapshot(raw)
    if (!payload || !inkCtx || !hiCtx) return
    const outer = getChartOuter()
    if (!outer) return
    const rect = outer.getBoundingClientRect()
    const cssW = rect.width
    const cssH = rect.height
    Promise.all([
      drawLayerFromDataUrl(inkCtx, inkCanvas, payload.ink, cssW, cssH),
      drawLayerFromDataUrl(hiCtx, hiCanvas, payload.hi, cssW, cssH),
    ]).then(updateUndoButton)
  }

  function pushHistory() {
    const snap = serializeSnapshot()
    if (!snap) return
    history.push(snap)
    if (history.length > HISTORY_MAX) {
      history.shift()
    }
    updateUndoButton()
  }

  function undoLast() {
    if (history.length <= 1) return
    history.pop()
    restoreSnapshot(history[history.length - 1])
    updateUndoButton()
  }

  window.captureChartWhiteboardSnapshot = serializeSnapshot

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
          '<button type="button" class="chart-wb-btn is-active" data-wb-tool="pen">書寫筆</button>' +
          '<button type="button" class="chart-wb-btn" data-wb-tool="highlighter">螢光筆</button>' +
          '<button type="button" class="chart-wb-btn" data-wb-tool="eraser">橡皮擦</button>' +
        '</div>' +
        '<div class="chart-wb-group chart-wb-colors">' +
          '<button type="button" class="chart-wb-color is-active" data-color="#d32f2f" style="background:#d32f2f" aria-label="紅色"></button>' +
          '<button type="button" class="chart-wb-color" data-color="#1a237e" style="background:#1a237e" aria-label="藍色"></button>' +
          '<button type="button" class="chart-wb-color" data-color="#f9a825" style="background:#f9a825" aria-label="黃色"></button>' +
        '</div>' +
        '<button type="button" class="chart-wb-btn" data-wb-undo disabled>復原上一動</button>' +
        '<button type="button" class="chart-wb-btn chart-wb-clear" data-wb-clear>清除手寫</button>' +
      '</div>'

    panel.insertBefore(wrap, panel.firstChild)

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
    wrap.querySelector('[data-wb-clear]').addEventListener('click', clearAllLayers)
    wrap.querySelector('[data-wb-undo]').addEventListener('click', undoLast)

    ui = wrap
    return ui
  }

  function createLayerCanvas(id, className) {
    const el = document.createElement('canvas')
    el.id = id
    el.className = className
    return el
  }

  function resizeCanvas() {
    if (!inkCanvas || !hiCanvas || !inkCtx || !hiCtx) return
    const outer = getChartOuter()
    if (!outer) return
    const rect = outer.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const snap = serializeSnapshot()

    ;[inkCanvas, hiCanvas].forEach(function (c) {
      c.width = Math.max(1, Math.floor(rect.width * dpr))
      c.height = Math.max(1, Math.floor(rect.height * dpr))
      c.style.width = rect.width + 'px'
      c.style.height = rect.height + 'px'
    })

    inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    hiCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    inkCtx.lineCap = 'round'
    inkCtx.lineJoin = 'round'
    hiCtx.lineCap = 'round'
    hiCtx.lineJoin = 'round'

    if (snap) restoreSnapshot(snap)
  }

  function syncCanvasPointer() {
    if (!inkCanvas || !hiCanvas) return
    const onHi = state.active && state.tool === 'highlighter'
    hiCanvas.classList.toggle('is-interactive', onHi)
    inkCanvas.classList.toggle('is-interactive', state.active && !onHi)
    inkCanvas.style.cursor = state.tool === 'eraser' ? 'cell' : 'crosshair'
    hiCanvas.style.cursor = 'crosshair'
  }

  function setTool(tool) {
    state.tool = tool
    if (!ui) return
    ui.querySelectorAll('[data-wb-tool]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.wbTool === tool)
    })
    syncCanvasPointer()
  }

  function setColor(color) {
    state.color = color
    if (state.tool === 'eraser') setTool('pen')
    if (!ui) return
    ui.querySelectorAll('.chart-wb-color').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.color === color)
    })
  }

  function activeDrawTarget() {
    if (state.tool === 'highlighter') {
      return { canvas: hiCanvas, ctx: hiCtx, layers: [{ canvas: hiCanvas, ctx: hiCtx }] }
    }
    if (state.tool === 'eraser') {
      return {
        canvas: inkCanvas,
        ctx: inkCtx,
        layers: [
          { canvas: inkCanvas, ctx: inkCtx },
          { canvas: hiCanvas, ctx: hiCtx },
        ],
      }
    }
    return { canvas: inkCanvas, ctx: inkCtx, layers: [{ canvas: inkCanvas, ctx: inkCtx }] }
  }

  function canvasPoint(canvas, evt) {
    const rect = canvas.getBoundingClientRect()
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top }
  }

  function applyStrokeStyle(ctx, tool) {
    const t = tool || state.tool
    if (t === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = 28
      ctx.globalAlpha = 1
      return
    }
    ctx.globalCompositeOperation = 'source-over'
    if (t === 'highlighter') {
      ctx.strokeStyle = highlighterColor(state.color)
      ctx.lineWidth = 26
      ctx.globalAlpha = 0.55
      return
    }
    ctx.strokeStyle = state.color
    ctx.lineWidth = 3
    ctx.globalAlpha = 1
  }

  function highlighterColor(hex) {
    if (hex === '#d32f2f') return 'rgba(244, 67, 54, 0.48)'
    if (hex === '#1a237e') return 'rgba(100, 181, 246, 0.55)'
    if (hex === '#f9a825') return 'rgba(255, 235, 59, 0.58)'
    return 'rgba(244, 67, 54, 0.48)'
  }

  function onDrawStart(evt) {
    if (!state.active) return
    const target = activeDrawTarget()
    if (evt.currentTarget !== target.canvas) return
    if (evt.pointerType === 'mouse' && evt.button !== 0) return
    state.drawing = true
    state.strokeStarted = true
    const pt = canvasPoint(target.canvas, evt)
    target.canvas.setPointerCapture(evt.pointerId)
    target.layers.forEach(function (layer) {
      applyStrokeStyle(layer.ctx)
      layer.ctx.beginPath()
      layer.ctx.moveTo(pt.x, pt.y)
    })
    evt.preventDefault()
  }

  function onDrawMove(evt) {
    if (!state.drawing || !state.active) return
    const target = activeDrawTarget()
    if (evt.currentTarget !== target.canvas) return
    const pt = canvasPoint(target.canvas, evt)
    target.layers.forEach(function (layer) {
      layer.ctx.lineTo(pt.x, pt.y)
      layer.ctx.stroke()
    })
    evt.preventDefault()
  }

  function onDrawEnd(evt) {
    if (!state.drawing) return
    state.drawing = false
    const target = activeDrawTarget()
    try {
      target.canvas.releasePointerCapture(evt.pointerId)
    } catch (_) {
      /* ignore */
    }
    if (inkCtx) {
      inkCtx.globalAlpha = 1
      inkCtx.globalCompositeOperation = 'source-over'
    }
    if (hiCtx) {
      hiCtx.globalAlpha = 1
      hiCtx.globalCompositeOperation = 'source-over'
    }
    if (state.strokeStarted) {
      state.strokeStarted = false
      pushHistory()
    }
  }

  function clearAllLayers() {
    if (!confirm('確定清除所有手寫與螢光標記？')) return
    const outer = getChartOuter()
    if (!outer || !inkCtx || !hiCtx) return
    const rect = outer.getBoundingClientRect()
    inkCtx.clearRect(0, 0, rect.width, rect.height)
    hiCtx.clearRect(0, 0, rect.width, rect.height)
    pushHistory()
  }

  function bindCanvasEvents() {
    ;[inkCanvas, hiCanvas].forEach(function (canvas) {
      if (!canvas || canvas.dataset.wbBound) return
      canvas.dataset.wbBound = '1'
      canvas.addEventListener('pointerdown', onDrawStart)
      canvas.addEventListener('pointermove', onDrawMove)
      canvas.addEventListener('pointerup', onDrawEnd)
      canvas.addEventListener('pointercancel', onDrawEnd)
    })
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
      setTool('pen')
      setColor('#d32f2f')
    } else {
      if (ui) ui.classList.add('hidden')
      if (inkCanvas) inkCanvas.remove()
      if (hiCanvas) hiCanvas.remove()
      inkCanvas = null
      hiCanvas = null
      inkCtx = null
      hiCtx = null
      history = []
    }
    updateToggleButton()
  }

  function attachCanvasesToChart(snapshot, resetHistory) {
    const outer = getChartOuter()
    if (!outer) return false
    if (getComputedStyle(outer).position === 'static') outer.style.position = 'relative'

    outer.querySelectorAll('#chartWhiteboardInk, #chartWhiteboardHi').forEach(function (n) {
      n.remove()
    })

    hiCanvas = createLayerCanvas('chartWhiteboardHi', 'chart-wb-canvas chart-wb-canvas-hi')
    inkCanvas = createLayerCanvas('chartWhiteboardInk', 'chart-wb-canvas chart-wb-canvas-ink')
    outer.appendChild(hiCanvas)
    outer.appendChild(inkCanvas)
    hiCtx = hiCanvas.getContext('2d')
    inkCtx = inkCanvas.getContext('2d')
    resizeCanvas()
    bindCanvasEvents()

    if (resetHistory) {
      history = []
      if (snapshot) {
        restoreSnapshot(snapshot)
        const snap = serializeSnapshot()
        if (snap) history.push(snap)
      } else {
        pushHistory()
      }
      updateUndoButton()
    } else if (snapshot) {
      restoreSnapshot(snapshot)
    }
    syncCanvasPointer()
    return true
  }

  function mountCanvas(snapshot) {
    return attachCanvasesToChart(snapshot, true)
  }

  window.syncChartWhiteboardAfterRender = function (snapshot) {
    if (!state.active) return
    const savedHistory = history.slice()
    attachCanvasesToChart(snapshot || null, false)
    if (savedHistory.length) {
      history = savedHistory
      updateUndoButton()
    }
  }

  window.addEventListener('resize', function () {
    if (state.active) resizeCanvas()
  })
})()
