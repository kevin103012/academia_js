import type { AiControlState, AiDomainId, NeuronNode } from '../types/ai'
import { dateAt, dateKey } from '../utils/date'

export interface AiDomainMeta {
  id: AiDomainId
  label: string
  shortLabel: string
  defaultName: string
  description: string
  samplePrompt: string
}

export const aiDomains: AiDomainMeta[] = [
  {
    id: 'linear-algebra',
    label: 'Álgebra Lineal y Matrices',
    shortLabel: 'Álgebra Lineal',
    defaultName: 'Sparks-LinAlg-Net',
    description: 'Sistemas de ecuaciones, matrices, determinantes, autovalores y espacios vectoriales.',
    samplePrompt: '¿Cómo escalono una matriz por Gauss-Jordan para hallar el rango?',
  },
  {
    id: 'digital-circuits',
    label: 'Circuitos y Lógica Digital',
    shortLabel: 'Circuitos Digitales',
    defaultName: 'Sparks-Circuit-Net',
    description: 'Compuertas lógicas, álgebra booleana, microcontroladores y análisis de nodos.',
    samplePrompt: '¿Por qué se corta la corriente del LED y cómo actúa una compuerta AND?',
  },
  {
    id: 'frameworks-arch',
    label: 'Frameworks y Arquitectura',
    shortLabel: 'Frameworks',
    defaultName: 'Sparks-FullStack-Net',
    description: 'React, TypeScript, APIs REST, arquitectura limpia y patrones de diseño.',
    samplePrompt: '¿Cómo separo servicios, hooks y componentes en React con TypeScript?',
  },
  {
    id: 'algorithms',
    label: 'Algoritmos y Estructuras',
    shortLabel: 'Algoritmos',
    defaultName: 'Sparks-Algo-Net',
    description: 'Complejidad temporal Big-O, grafos, árboles, recursión y programación dinámica.',
    samplePrompt: '¿Cómo comparo la complejidad O(n log n) frente a O(n²) en un algoritmo?',
  },
]

export const initialNeurons: NeuronNode[] = [
  { id: 'in-symbolic', layer: 'input', label: 'Razonamiento simbólico', detail: 'Extrae variables, matrices y expresiones matemáticas del enunciado.', activation: 'Linear', weightNorm: 0.93, enabled: true },
  { id: 'in-ast', layer: 'input', label: 'Patrones AST y código', detail: 'Analiza sintaxis de frameworks, tipos y flujo de componentes.', activation: 'Linear', weightNorm: 0.91, enabled: true },
  { id: 'in-circuit', layer: 'input', label: 'Señales y nodos', detail: 'Interpreta topologías de circuitos, voltajes y compuertas lógicas.', activation: 'Linear', weightNorm: 0.88, enabled: true },
  { id: 'in-temporal', layer: 'input', label: 'Secuencia de práctica', detail: 'Registra ritmo de resolución, intentos y pausas recientes.', activation: 'Linear', weightNorm: 0.80, enabled: true },
  { id: 'in-mastery', layer: 'input', label: 'Evidencia competencia', detail: 'Pondera rúbricas previas y errores frecuentes por tema.', activation: 'Linear', weightNorm: 0.85, enabled: true },

  { id: 'gru-1', layer: 'hidden1', label: 'GRU Secuencia 1', detail: 'Rastrea progresión paso a paso en demostraciones y ejercicios.', activation: 'GRU', weightNorm: 0.89, enabled: true },
  { id: 'gru-2', layer: 'hidden1', label: 'GRU Secuencia 2', detail: 'Detecta errores recurrentes de signos, rangos o tipos.', activation: 'GRU', weightNorm: 0.79, enabled: true },
  { id: 'gru-3', layer: 'hidden1', label: 'GRU Secuencia 3', detail: 'Modela transiciones entre teoría y laboratorio práctico.', activation: 'GRU', weightNorm: 0.84, enabled: true },
  { id: 'gru-4', layer: 'hidden1', label: 'GRU Secuencia 4', detail: 'Correlaciona consultas al tutor con entregas evaluadas.', activation: 'GRU', weightNorm: 0.74, enabled: true },
  { id: 'gru-5', layer: 'hidden1', label: 'GRU Secuencia 5', detail: 'Estabiliza predicciones con historiales cortos.', activation: 'GRU', weightNorm: 0.68, enabled: true },

  { id: 'dense-1', layer: 'hidden2', label: 'Fusión Densa 1', detail: 'Combina álgebra simbólica con historial de ejercicios.', activation: 'ReLU', weightNorm: 0.92, enabled: true },
  { id: 'dense-2', layer: 'hidden2', label: 'Fusión Densa 2', detail: 'Relaciona conceptos de hardware con código y abstracción.', activation: 'ReLU', weightNorm: 0.83, enabled: true },
  { id: 'dense-3', layer: 'hidden2', label: 'Fusión Densa 3', detail: 'Calibra dificultad de pistas para el estudiante.', activation: 'ReLU', weightNorm: 0.86, enabled: true },
  { id: 'dense-4', layer: 'hidden2', label: 'Fusión Densa 4', detail: 'Filtra ruido en logs y entregas incompletas.', activation: 'ReLU', weightNorm: 0.73, enabled: true },
  { id: 'dense-5', layer: 'hidden2', label: 'Fusión Densa 5', detail: 'Sintetiza sugerencias de rúbrica para docentes.', activation: 'ReLU', weightNorm: 0.70, enabled: true },

  { id: 'out-domain', layer: 'output', label: 'Especialidad dominio', detail: 'Cabeza A: precisión técnica en el dominio entrenado.', activation: 'Sigmoid', weightNorm: 0.95, enabled: true },
  { id: 'out-mastery', layer: 'output', label: 'Dominio competencia', detail: 'Cabeza B: estimación de nivel de logro técnico.', activation: 'Sigmoid', weightNorm: 0.88, enabled: true },
  { id: 'out-tutor', layer: 'output', label: 'Guía paso a paso', detail: 'Cabeza C: priorización pedagógica para alumnos y docentes.', activation: 'Sigmoid', weightNorm: 0.84, enabled: true },
]

export function buildNeuronMask(neurons: NeuronNode[]): Record<string, boolean> {
  return Object.fromEntries(neurons.map((node) => [node.id, node.enabled]))
}

export function createInitialAiState(): AiControlState {
  const fullMask = buildNeuronMask(initialNeurons)
  const circuitMask = { ...fullMask, 'gru-5': false, 'dense-4': false }
  const frameworkMask = { ...fullMask, 'in-circuit': false, 'gru-4': false, 'dense-5': false }

  return {
    selectedDomain: 'linear-algebra',
    draftModelName: 'Sparks-LinAlg-Pro',
    neurons: initialNeurons.map((node) => ({ ...node })),
    hyperparams: {
      learningRate: 0.003,
      targetEpochs: 20,
      batchSize: 32,
      dropoutRate: 0.15,
    },
    currentEpoch: 6,
    status: 'paused',
    history: [
      { epoch: 1, trainLoss: 0.842, valLoss: 0.861, accuracy: 61.4 },
      { epoch: 2, trainLoss: 0.684, valLoss: 0.709, accuracy: 68.9 },
      { epoch: 3, trainLoss: 0.562, valLoss: 0.594, accuracy: 74.2 },
      { epoch: 4, trainLoss: 0.471, valLoss: 0.512, accuracy: 78.6 },
      { epoch: 5, trainLoss: 0.402, valLoss: 0.449, accuracy: 82.1 },
      { epoch: 6, trainLoss: 0.351, valLoss: 0.404, accuracy: 84.8 },
    ],
    config: {
      minConfidence: 72,
      riskSensitivity: 'media',
      maxDailySuggestions: 4,
      humanReviewRequired: true,
      explainabilityEnabled: true,
      strictPseudonymization: true,
      deterministicFallback: true,
      studentGlobalEnabled: true,
      teacherGlobalEnabled: true,
      stepByStepStudentMode: true,
    },
    models: [
      {
        id: 'model-linalg-v13',
        name: 'Sparks-LinAlg-Net',
        version: 'v1.3.0',
        domain: 'linear-algebra',
        domainLabel: 'Álgebra Lineal y Matrices',
        architecture: 'GRU + Densa Especializada (18/18 neuronas)',
        activeNeurons: 18,
        totalNeurons: 18,
        neuronMask: fullMask,
        epochsTrained: 20,
        valAccuracy: 91.4,
        valLoss: 0.241,
        latencyMs: 36,
        createdAt: dateAt(-2),
        enabledForStudents: true,
        enabledForTeachers: true,
      },
      {
        id: 'model-circuit-v12',
        name: 'Sparks-Circuit-Net',
        version: 'v1.2.0',
        domain: 'digital-circuits',
        domainLabel: 'Circuitos y Lógica Digital',
        architecture: 'GRU + Densa Podada (16/18 neuronas)',
        activeNeurons: 16,
        totalNeurons: 18,
        neuronMask: circuitMask,
        epochsTrained: 18,
        valAccuracy: 88.6,
        valLoss: 0.294,
        latencyMs: 31,
        createdAt: dateAt(-5),
        enabledForStudents: true,
        enabledForTeachers: true,
      },
      {
        id: 'model-frameworks-v11',
        name: 'Sparks-FullStack-Net',
        version: 'v1.1.0',
        domain: 'frameworks-arch',
        domainLabel: 'Frameworks y Arquitectura',
        architecture: 'GRU + Densa Podada (15/18 neuronas)',
        activeNeurons: 15,
        totalNeurons: 18,
        neuronMask: frameworkMask,
        epochsTrained: 15,
        valAccuracy: 86.2,
        valLoss: 0.338,
        latencyMs: 29,
        createdAt: dateAt(-9),
        enabledForStudents: false,
        enabledForTeachers: true,
      },
    ],
    dataset: {
      version: 'ds-2026.11-systems',
      records: 1480,
      completeness: 99.2,
      duplicates: 0,
      trainSplit: 70,
      valSplit: 15,
      testSplit: 15,
      lastVerifiedAt: dateKey(),
    },
  }
}
