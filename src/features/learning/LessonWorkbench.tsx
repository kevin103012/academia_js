import { useState } from 'react'
import { CheckCircle2, Cpu, HelpCircle, Play, RotateCcw, Terminal, Zap } from 'lucide-react'
import type { LessonLabKind } from '../../types/learning'

interface LessonWorkbenchProps {
  lessonId: string
  labKind: LessonLabKind
  goal?: string
  hint?: string
  canLearn: boolean
  lessonDone: boolean
  onCompleteLesson: () => void
}

type GateKind = 'AND' | 'OR' | 'NAND' | 'XOR'

function evalGate(gate: GateKind, a: 0 | 1, b: 0 | 1): 0 | 1 {
  if (gate === 'AND') return a === 1 && b === 1 ? 1 : 0
  if (gate === 'OR') return a === 1 || b === 1 ? 1 : 0
  if (gate === 'NAND') return a === 1 && b === 1 ? 0 : 1
  return a !== b ? 1 : 0
}

export function LessonWorkbench({
  lessonId,
  labKind,
  goal,
  hint,
  canLearn,
  lessonDone,
  onCompleteLesson,
}: LessonWorkbenchProps) {
  const [showHint, setShowHint] = useState(false)
  const [verified, setVerified] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string>('')

  // Circuit sandbox state
  const [gate, setGate] = useState<GateKind>('AND')
  const [inputA, setInputA] = useState<0 | 1>(1)
  const [inputB, setInputB] = useState<0 | 1>(0)

  // Matrix Gauss-Jordan sandbox state: [[2, 1, 5], [4, 3, 11]]
  const [matrix, setMatrix] = useState<number[][]>([
    [2, 1, 5],
    [4, 3, 11],
  ])
  const [opsLog, setOpsLog] = useState<string[]>(['Sistema inicial: 2x₁ + x₂ = 5, 4x₁ + 3x₂ = 11'])

  // Architecture contract runner state
  const [layerMap, setLayerMap] = useState({
    types: 'models',
    services: 'io',
    hooks: 'ui-state',
  })

  function verifyCircuit() {
    const out = evalGate(gate, inputA, inputB)
    if (lessonId === 'circuit-materials') {
      const ok = gate === 'NAND' && inputA === 1 && inputB === 1 && out === 0
      setVerified(ok)
      setStatusMsg(
        ok
          ? 'PASS: Compuerta NAND verificada — (A=1, B=1) entrega 0.0 V y apaga el LED.'
          : 'Ajusta a compuerta NAND con A=1 y B=1 para observar la salida en bajo (0).',
      )
      return
    }
    if (lessonId === 'circuit-evidence') {
      const ok = gate === 'XOR' && out === 1
      setVerified(ok)
      setStatusMsg(
        ok
          ? `PASS: Detector XOR verificado — discrepancia (${inputA}, ${inputB}) genera 4.9 V.`
          : 'Selecciona compuerta XOR y entradas distintas (1 y 0) para disparar la señal.',
      )
      return
    }
    const ok = gate === 'AND' && inputA === 1 && inputB === 1 && out === 1
    setVerified(ok)
    setStatusMsg(
      ok
        ? 'PASS: Circuito cerrado verificado — 4.9 V en salida y 9.1 mA en carga LED.'
        : 'Configura compuerta AND con A=1 y B=1 para completar el lazo de conducción.',
    )
  }

  function applyRowOp(op: 'elim-r2' | 'norm-r1' | 'elim-r1' | 'reset') {
    if (op === 'reset') {
      setMatrix([
        [2, 1, 5],
        [4, 3, 11],
      ])
      setOpsLog(['Sistema restaurado: [2 1 | 5; 4 3 | 11]'])
      setVerified(false)
      setStatusMsg('')
      return
    }
    setMatrix((prev) => {
      const next = prev.map((row) => [...row])
      if (op === 'elim-r2') {
        const factor = next[0][0] !== 0 ? next[1][0] / next[0][0] : 0
        next[1] = next[1].map((v, i) => Number((v - factor * next[0][i]).toFixed(2)))
        setOpsLog((logs) => [...logs.slice(-3), `R₂ ← R₂ - ${factor}·R₁`])
      } else if (op === 'norm-r1') {
        const pivot = next[0][0] || 1
        next[0] = next[0].map((v) => Number((v / pivot).toFixed(2)))
        setOpsLog((logs) => [...logs.slice(-3), `R₁ ← R₁ / ${pivot}`])
      } else if (op === 'elim-r1') {
        const factor = next[1][1] !== 0 ? next[0][1] / next[1][1] : 0
        next[0] = next[0].map((v, i) => Number((v - factor * next[1][i]).toFixed(2)))
        setOpsLog((logs) => [...logs.slice(-3), `R₁ ← R₁ - ${factor}·R₂`])
      }
      return next
    })
  }

  function verifyMatrix() {
    const isIdentity =
      Math.abs(matrix[0][0] - 1) < 0.01 &&
      Math.abs(matrix[0][1]) < 0.01 &&
      Math.abs(matrix[1][0]) < 0.01 &&
      Math.abs(matrix[1][1] - 1) < 0.01
    setVerified(isIdentity)
    setStatusMsg(
      isIdentity
        ? `PASS: Gauss-Jordan completado — x₁ = ${matrix[0][2]}, x₂ = ${matrix[1][2]} (Rango = 2).`
        : 'Aplica las operaciones por fila hasta reducir la submatriz izquierda a la identidad I₂.',
    )
  }

  function verifyArchitecture() {
    const ok = layerMap.types === 'models' && layerMap.services === 'io' && layerMap.hooks === 'ui-state'
    setVerified(ok)
    setStatusMsg(
      ok
        ? 'PASS (3/3): Contratos TypeScript puros, I/O aislado en services/ y estado React vía hooks/.'
        : 'Revisa el rol de cada carpeta: evita exponer I/O directo dentro de hooks o tipos.',
    )
  }

  const out = evalGate(gate, inputA, inputB)
  const det = Number((matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]).toFixed(2))
  const isReducedIdentity =
    Math.abs(matrix[0][0] - 1) < 0.01 &&
    Math.abs(matrix[0][1]) < 0.01 &&
    Math.abs(matrix[1][0]) < 0.01 &&
    Math.abs(matrix[1][1] - 1) < 0.01

  return (
    <aside className="learn-workbench theme-dark" aria-label="Laboratorio práctico de la lección">
      <div className="learn-workbench__bar">
        <div className="learn-workbench__title">
          <Terminal size={15} aria-hidden="true" />
          <span>
            {labKind === 'circuit'
              ? 'Simulador lógico digital'
              : labKind === 'matrix'
                ? 'Laboratorio Gauss-Jordan'
                : 'Validador de arquitectura'}
          </span>
        </div>
        <button
          type="button"
          className="learn-workbench__hint-btn tone-pill"
          onClick={() => setShowHint((v) => !v)}
        >
          <HelpCircle size={14} aria-hidden="true" /> {showHint ? 'Ocultar pista' : 'Ver pista'}
        </button>
      </div>

      {goal && <p className="learn-workbench__goal">{goal}</p>}
      {showHint && hint && <p className="learn-workbench__hint">{hint}</p>}

      {labKind === 'circuit' && (
        <div className="learn-lab-body">
          <div className="learn-lab-controls">
            <label>
              Compuerta
              <select value={gate} onChange={(e) => setGate(e.target.value as GateKind)}>
                <option value="AND">AND</option>
                <option value="OR">OR</option>
                <option value="NAND">NAND</option>
                <option value="XOR">XOR</option>
              </select>
            </label>
            <button
              type="button"
              className={`learn-toggle-bit ${inputA === 1 ? 'tone-soft-accent' : 'tone-pill'}`}
              aria-pressed={inputA === 1}
              onClick={() => setInputA(inputA === 1 ? 0 : 1)}
            >
              Entrada A: <strong>{inputA}</strong>
            </button>
            <button
              type="button"
              className={`learn-toggle-bit ${inputB === 1 ? 'tone-soft-accent' : 'tone-pill'}`}
              aria-pressed={inputB === 1}
              onClick={() => setInputB(inputB === 1 ? 0 : 1)}
            >
              Entrada B: <strong>{inputB}</strong>
            </button>
          </div>

          <div className="learn-circuit-stage">
            <svg viewBox="0 0 360 112" className="learn-circuit-svg" role="img" aria-label="Esquema lógico en vivo">
              <line x1="20" y1="36" x2="112" y2="36" className={inputA ? 'wire-on' : 'wire-off'} />
              <line x1="20" y1="76" x2="112" y2="76" className={inputB ? 'wire-on' : 'wire-off'} />
              <text x="16" y="28" className="wire-label">
                A={inputA} ({inputA ? '5V' : '0V'})
              </text>
              <text x="16" y="68" className="wire-label">
                B={inputB} ({inputB ? '5V' : '0V'})
              </text>

              <rect x="112" y="22" width="76" height="68" rx="12" className="gate-box" />
              <text x="150" y="60" textAnchor="middle" className="gate-label">
                {gate}
              </text>

              <line x1="188" y1="56" x2="266" y2="56" className={out ? 'wire-on' : 'wire-off'} />
              <circle cx="292" cy="56" r="17" className={out ? 'led-on' : 'led-off'} />
              <text x="292" y="92" textAnchor="middle" className="wire-label">
                {out ? 'LED ON · 4.9 V' : 'LED OFF · 0.0 V'}
              </text>
            </svg>

            <table className="learn-truth-table" aria-label="Tabla de verdad activa">
              <thead>
                <tr>
                  <th>A</th>
                  <th>B</th>
                  <th>{gate}</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    [0, 0],
                    [0, 1],
                    [1, 0],
                    [1, 1],
                  ] as const
                ).map(([a, b]) => {
                  const active = a === inputA && b === inputB
                  return (
                    <tr key={`${a}${b}`} data-active={active || undefined}>
                      <td>{a}</td>
                      <td>{b}</td>
                      <td>{evalGate(gate, a, b)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="learn-lab-footer">
            <button type="button" className="learn-action" onClick={verifyCircuit}>
              <Zap size={15} aria-hidden="true" /> Verificar simulación
            </button>
          </div>
        </div>
      )}

      {labKind === 'matrix' && (
        <div className="learn-lab-body">
          <div className="learn-matrix-grid" role="group" aria-label="Matriz aumentada">
            {matrix.map((row, rIdx) => (
              <div className="learn-matrix-row" key={rIdx}>
                <span className="learn-matrix-tag">R{rIdx + 1}</span>
                <code>{row[0]}</code>
                <code>{row[1]}</code>
                <span className="learn-matrix-sep">|</span>
                <code className="learn-matrix-rhs">{row[2]}</code>
              </div>
            ))}
          </div>

          <div className="learn-matrix-stats">
            <span>det(A): <strong>{det}</strong></span>
            <span>Rango: <strong>{det !== 0 ? 2 : 1}</strong></span>
            <span>Estado: <strong>{isReducedIdentity ? 'Identidad I₂' : 'Por reducir'}</strong></span>
          </div>

          <div className="learn-lab-ops">
            <button type="button" className="ai-mini-btn tone-pill" onClick={() => applyRowOp('elim-r2')}>
              R₂ ← R₂ - 2·R₁
            </button>
            <button type="button" className="ai-mini-btn tone-pill" onClick={() => applyRowOp('norm-r1')}>
              Normalizar R₁
            </button>
            <button type="button" className="ai-mini-btn tone-pill" onClick={() => applyRowOp('elim-r1')}>
              R₁ ← R₁ - 0.5·R₂
            </button>
            <button type="button" className="ai-mini-btn tone-danger" onClick={() => applyRowOp('reset')}>
              <RotateCcw size={13} aria-hidden="true" />
            </button>
          </div>

          <div className="learn-console">
            {opsLog.map((line, i) => (
              <div key={i}>› {line}</div>
            ))}
          </div>

          <div className="learn-lab-footer">
            <button type="button" className="learn-action" onClick={verifyMatrix}>
              <Play size={15} aria-hidden="true" /> Verificar escalonado
            </button>
          </div>
        </div>
      )}

      {labKind === 'architecture' && (
        <div className="learn-lab-body">
          <div className="learn-arch-rows">
            <label>
              <span>src/types/</span>
              <select value={layerMap.types} onChange={(e) => setLayerMap({ ...layerMap, types: e.target.value })}>
                <option value="models">Contratos puros e interfaces de dominio</option>
                <option value="io">Llamadas fetch() y localStorage</option>
                <option value="ui">Renderizado JSX y estilos</option>
              </select>
            </label>
            <label>
              <span>src/services/</span>
              <select
                value={layerMap.services}
                onChange={(e) => setLayerMap({ ...layerMap, services: e.target.value })}
              >
                <option value="models">Solo tipos sin lógica</option>
                <option value="io">Adaptadores HTTP / localStorage tras interfaz</option>
                <option value="ui">Componentes de formulario</option>
              </select>
            </label>
            <label>
              <span>src/hooks/</span>
              <select value={layerMap.hooks} onChange={(e) => setLayerMap({ ...layerMap, hooks: e.target.value })}>
                <option value="io">Queries directas a localStorage</option>
                <option value="ui-state">Acceso reactivo a contexto/servicios para UI</option>
                <option value="css">Variables de diseño tonal</option>
              </select>
            </label>
          </div>

          <div className="learn-console">
            <div>› Suite: modular-architecture.spec.ts (3 aserciones)</div>
            <div>› Objetivo: 0 acoplamientos de persistencia en src/features/</div>
          </div>

          <div className="learn-lab-footer">
            <button type="button" className="learn-action" onClick={verifyArchitecture}>
              <Cpu size={15} aria-hidden="true" /> Ejecutar suite de contratos
            </button>
          </div>
        </div>
      )}

      {statusMsg && (
        <div className={`learn-workbench__status ${verified ? 'is-pass' : 'is-warn'}`} role="status">
          <span>{statusMsg}</span>
          {verified && canLearn && !lessonDone && (
            <button type="button" className="ai-mini-btn tone-accent" onClick={onCompleteLesson}>
              <CheckCircle2 size={14} aria-hidden="true" /> Completar lección
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
