import type { CourseMaterial } from '../types/learning'

export const passingScore = 67

export const materials: Record<string, CourseMaterial> = {
  science: {
    lessons: [
      {
        id: 'circuit-basics',
        title: 'Flujo de corriente y señal digital',
        summary: 'Identifica los nodos de un circuito cerrado y diferencia niveles lógicos alto y bajo.',
        minutes: 8,
        reading: [
          'Un circuito eléctrico requiere un lazo cerrado entre fuente, carga y tierra para que circule corriente. En electrónica digital, esos niveles de tensión representan estados binarios: 1 lógico (encendido) y 0 lógico (apagado).',
          'Si un interruptor abre la malla, la corriente cae a cero y la salida pasa a estado bajo. Comprender esta base física evita errores comunes al cablear microcontroladores y protoboards.',
        ],
        keySteps: [
          'Verifica alimentación de 5 V y referencia común (GND).',
          'Calcula la resistencia limitadora para proteger el LED.',
          'Mide el nivel lógico a la salida de la etapa digital.',
        ],
        formulaOrCode: `// Malla LED digital 5 V
V_out = (A && B) ? 5.0 : 0.0   // Nivel lógico ALTO / BAJO
I_LED = (5.0V - 2.0V) / 330Ω   // ≈ 9.1 mA de conducción`,
        exercise: 'Activa el lazo cerrado con la compuerta AND y ambas entradas en 1 para encender el LED.',
        labKind: 'circuit',
        labGoal: 'Configura la compuerta AND con A = 1 y B = 1 para validar conducción a 4.9 V.',
        labHint: 'Con una compuerta AND, basta que una entrada valga 0 para abrir la conducción hacia el LED.',
      },
      {
        id: 'circuit-materials',
        title: 'Compuertas lógicas y conductores',
        summary: 'Aplica tablas de verdad AND/OR/NOT y compara materiales conductores y aislantes.',
        minutes: 7,
        reading: [
          'Una compuerta AND entrega 1 únicamente cuando todas sus entradas valen 1, mientras que una compuerta OR entrega 1 si al menos una entrada está activa. Combinarlas permite construir sumadores y multiplexores.',
          'Al implementar circuitos físicos, el cobre y las pistas de PCB conducen la señal con baja resistencia, mientras que el encapsulado aislante protege contra cortocircuitos entre nodos adyacentes.',
        ],
        keySteps: [
          'Selecciona el operador lógico adecuado (AND, OR, NAND, XOR).',
          'Evalúa las 4 combinaciones binarias de la tabla de verdad.',
          'Identifica la única combinación que apaga una compuerta NAND.',
        ],
        formulaOrCode: `// Tabla lógica NAND: Q = !(A · B)
A=0, B=0 -> Q=1  |  A=0, B=1 -> Q=1
A=1, B=0 -> Q=1  |  A=1, B=1 -> Q=0`,
        exercise: 'Configura la compuerta NAND en el simulador y comprueba qué combinación apaga la salida.',
        labKind: 'circuit',
        labGoal: 'Selecciona NAND con A = 1 y B = 1 para comprobar que la salida cae a 0.',
        labHint: 'NAND invierte la salida de AND: cuando ambas entradas están en alto (1, 1), la salida pasa a 0.',
      },
      {
        id: 'circuit-evidence',
        title: 'Verificación y telemetría de nodos',
        summary: 'Registra mediciones de voltaje y contraste lógico para validar el prototipo.',
        minutes: 9,
        reading: [
          'Antes de energizar un diseño, formula una hipótesis sobre el voltaje esperado en cada nodo de prueba. Luego contrasta la medición real con un multímetro o simulador lógico.',
          'Cuando un LED no enciende, revisa polaridad, resistencia de protección y continuidad a tierra antes de reemplazar componentes.',
        ],
        keySteps: [
          'Contrasta el voltaje medido frente a la tabla de verdad esperada.',
          'Aísla fallas por etapas: fuente → compuerta → resistencia → carga.',
          'Valida un detector de desigualdad usando compuerta XOR.',
        ],
        formulaOrCode: `// Comparador binario XOR: Q = A ⊕ B
Q = (A !== B) ? 1 : 0   // Activa alerta cuando las señales difieren`,
        exercise: 'Simula una condición de discrepancia entre A y B con la compuerta XOR.',
        labKind: 'circuit',
        labGoal: 'Selecciona XOR con entradas distintas (ej. A = 1, B = 0) para disparar la señal de control.',
        labHint: 'XOR entrega 1 lógico exclusivamente cuando A y B tienen estados opuestos.',
      },
    ],
    questions: [
      { prompt: '¿Qué condición necesita un circuito básico para que circule corriente?', options: ['Un interruptor abierto', 'Un camino cerrado entre fuente y tierra', 'Un cable aislante en serie'], answer: 1, explanation: 'La corriente requiere continuidad eléctrica en un lazo cerrado.' },
      { prompt: '¿Cuándo entrega 1 una compuerta AND de dos entradas?', options: ['Cuando ambas entradas son 1', 'Cuando ambas entradas son 0', 'Cuando solo una entrada es 1'], answer: 0, explanation: 'La operación lógica AND exige que todas sus entradas estén en estado alto.' },
      { prompt: '¿Qué dato corresponde a una verificación empírica en laboratorio?', options: ['Suponer que la fuente funciona', 'Registrar 4.9 V medidos en el nodo de salida', 'Cambiar el LED sin medir'], answer: 1, explanation: 'La verificación se basa en una medición registrada durante la prueba.' },
    ],
  },
  math: {
    lessons: [
      {
        id: 'proportion-ratio',
        title: 'Matrices, vectores y dimensiones',
        summary: 'Representa sistemas de datos e imágenes mediante arreglos matriciales y operaciones lineales.',
        minutes: 7,
        reading: [
          'Una matriz de tamaño m × n organiza datos en m filas y n columnas. En ingeniería de sistemas se usa desde gráficos 3D hasta pesos de capas en redes neuronales.',
          'Para multiplicar una matriz A (m × k) por B (k × n), el número de columnas de A debe coincidir con el número de filas de B, produciendo una matriz resultante m × n.',
        ],
        keySteps: [
          'Verifica compatibilidad de dimensiones internas (k == k).',
          'Calcula el determinante det(A) para saber si la matriz es invertible.',
          'Inspecciona el vector resultante en el laboratorio matricial.',
        ],
        formulaOrCode: `A = [ 2  1 ]   x = [ x₁ ]   b = [  5 ]
    [ 4  3 ]       [ x₂ ]       [ 11 ]
det(A) = (2·3) - (1·4) = 2 ≠ 0  => solución única`,
        exercise: 'Usa el laboratorio de la derecha para reducir parcialmente el sistema y comprobar el rango completo.',
        labKind: 'matrix',
        labGoal: 'Lleva el sistema aumentado [2 1 | 5; 4 3 | 11] a la forma identidad reducida.',
        labHint: 'Primero elimina el coeficiente 4 debajo del pivote (R2 ← R2 - 2·R1), luego normaliza y limpia hacia arriba.',
      },
      {
        id: 'proportion-unit',
        title: 'Eliminación de Gauss-Jordan y rango',
        summary: 'Escala y reduce sistemas lineales por filas para determinar unicidad de soluciones.',
        minutes: 8,
        reading: [
          'Las operaciones elementales por filas (intercambiar filas, multiplicar por un escalar no nulo y sumar múltiplos de otra fila) preservan el conjunto solución del sistema.',
          'Al llevar la matriz aumentada a su forma escalonada reducida identificas los pivotes. La cantidad de pivotes define el rango de la matriz y revela si el sistema es compatible determinado, indeterminado o incompatible.',
        ],
        keySteps: [
          'Elimina las entradas debajo del pivote 1 con R2 ← R2 - 2·R1.',
          'Escala la fila del pivote a 1 (R1 ← R1 / 2).',
          'Limpia sobre el segundo pivote (R1 ← R1 - 0.5·R2) para leer [x₁, x₂].',
        ],
        formulaOrCode: `[ 2  1 |  5 ]  ──(R2 ← R2 - 2·R1)──▶  [ 2  1 | 5 ]
[ 4  3 | 11 ]                        [ 0  1 | 1 ]
Resultado escalonado:  x₁ = 2,  x₂ = 1  (Rango = 2)`,
        exercise: 'Ejecuta los 3 pasos elementales de Gauss-Jordan en el laboratorio matricial hasta obtener I₂.',
        labKind: 'matrix',
        labGoal: 'Completa la matriz identidad [[1, 0 | 2], [0, 1 | 1]] aplicando las operaciones por fila.',
        labHint: 'Aplica las tres operaciones en orden de arriba hacia abajo: eliminación inferior, normalización y eliminación superior.',
      },
      {
        id: 'proportion-check',
        title: 'Transformaciones lineales y autovalores',
        summary: 'Interpreta cómo una matriz rota o escala vectores y cuándo mantiene su dirección.',
        minutes: 7,
        reading: [
          'Una transformación lineal T(v) = A·v mapea vectores preservando sumas y escalamientos. Los autovectores son direcciones especiales que solo se estiran o invierten por un factor escalar λ (autovalor).',
          'En análisis de datos y machine learning, los autovalores permiten reducir dimensiones (PCA) y analizar la estabilidad de iteraciones matriciales.',
        ],
        keySteps: [
          'Resuelve la ecuación característica det(A - λI) = 0.',
          'Verifica que los pivotes de una matriz diagonal determinan sus autovalores.',
          'Valida la invertibilidad y solución en el panel interactivo.',
        ],
        formulaOrCode: `A · v = λ · v   ⟺   (A - λI) · v = 0
Ejemplo: si A es invertible (det ≠ 0), rango(A) = n y λᵢ ≠ 0`,
        exercise: 'Verifica que el sistema del laboratorio tiene rango 2 y solución única mediante reducción completa.',
        labKind: 'matrix',
        labGoal: 'Obtén rango = 2 y forma escalonada reducida en el laboratorio matricial.',
        labHint: 'Cuando el determinante es distinto de cero, ninguna fila se anula durante Gauss-Jordan.',
      },
    ],
    questions: [
      { prompt: 'Si A es de tamaño 3 × 4 y B de tamaño 4 × 2, ¿qué dimensión tiene A · B?', options: ['4 × 4', '3 × 2', 'No se pueden multiplicar'], answer: 1, explanation: 'Coinciden las dimensiones internas (4) y el producto hereda 3 filas y 2 columnas.' },
      { prompt: '¿Qué indica el rango de una matriz escalonada?', options: ['El número de filas nulas', 'La cantidad de pivotes no nulos o filas linealmente independientes', 'La suma de la diagonal'], answer: 1, explanation: 'Cada pivote corresponde a una dirección linealmente independiente.' },
      { prompt: '¿Qué cumple un autovector v respecto a la matriz A y su autovalor λ?', options: ['A · v = λ · v', 'A + v = λ', 'det(A) = 0 siempre'], answer: 0, explanation: 'Al aplicar A, el autovector conserva su dirección multiplicado por el escalar λ.' },
    ],
  },
  language: {
    lessons: [
      {
        id: 'reading-main-idea',
        title: 'Arquitectura modular y separación de capas',
        summary: 'Divide la aplicación en tipos, servicios, hooks y vistas para desacoplar UI y datos.',
        minutes: 6,
        reading: [
          'Un componente de interfaz no debería conocer detalles de fetch, tokens o localStorage. Al encapsular la persistencia detrás de interfaces en services/, podés cambiar mocks locales por una API REST sin reescribir páginas.',
          'Separar carpetas por responsabilidad (types, data, services, context, hooks, features) acelera el mantenimiento en equipo y evita archivos monolíticos difíciles de probar.',
        ],
        keySteps: [
          'Define contratos de dominio puros dentro de src/types/.',
          'Encapsula HTTP y localStorage detrás de adaptadores en src/services/.',
          'Consume el estado desde src/hooks/ o src/context/ dentro de features/.',
        ],
        formulaOrCode: `// Contrato desacoplado (src/services/auth/authService.ts)
export interface AuthService {
  signIn(email: string, password: string): Promise<DemoUser>
  signOut(): Promise<void>
}`,
        exercise: 'Asigna la responsabilidad correcta a cada capa en el validador interactivo y ejecuta las pruebas.',
        labKind: 'architecture',
        labGoal: 'Mapea correctamente types/, services/ y hooks/ y corre la suite de contratos.',
        labHint: 'La capa services/ es la única autorizada para hablar con fetch o localStorage.',
      },
      {
        id: 'reading-evidence',
        title: 'Contratos tipados y manejo de estado',
        summary: 'Usa TypeScript estricto y contextos reactivos para sincronizar flujos de usuario.',
        minutes: 8,
        reading: [
          'Definir tipos explícitos para entidades de dominio y respuestas HTTP detecta inconsistencias en tiempo de compilación antes de llegar a producción.',
          'Un wrapper HTTP centralizado (como apiClient) estandariza headers JSON, credenciales y errores ApiError en toda la plataforma.',
        ],
        keySteps: [
          'Activa strict y verbatimModuleSyntax en tsconfig.json.',
          'Centraliza cabeceras y manejo de status HTTP en apiClient.',
          'Valida la separación entre contratos, adaptadores y hooks.',
        ],
        formulaOrCode: `export async function getCourse(id: string): Promise<Course> {
  return apiClient.get<Course>(\`/courses/\${encodeURIComponent(id)}\`)
}`,
        exercise: 'Valida el contrato de capas en el panel derecho y ejecuta los tests de integración mock.',
        labKind: 'architecture',
        labGoal: 'Ejecuta la suite de arquitectura verificando 0 fugas entre UI y persistencia.',
        labHint: 'Los hooks exponen estado y acciones reactivas; nunca construyen queries SQL ni leen storage directo.',
      },
      {
        id: 'reading-discussion',
        title: 'Integración progresiva de APIs y rutas',
        summary: 'Configura variables de entorno y rutas protegidas para migrar módulo por módulo.',
        minutes: 7,
        reading: [
          'Usar banderas de entorno como VITE_API_URL permite alternar limpiamente entre adaptadores locales y endpoints reales módulo por módulo.',
          'Las rutas protegidas en el frontend mejoran la experiencia de navegación, pero la autorización definitiva siempre debe validarse en el backend.',
        ],
        keySteps: [
          'Mantén env.useMocks como conmutador por servicio.',
          'Protege las vistas privadas con ProtectedRoute y validación de rol.',
          'Re-valida permisos en el backend por cada endpoint REST.',
        ],
        formulaOrCode: `export const aiService: AiService =
  env.useMocks ? localAiService : httpAiService`,
        exercise: 'Confirma el mapa de responsabilidades de arquitectura limpia y corre la verificación.',
        labKind: 'architecture',
        labGoal: 'Valida las 3 capas del módulo para habilitar la migración al backend REST.',
        labHint: 'types/ define modelos puros, services/ implementa I/O, y hooks/ conecta con React.',
      },
    ],
    questions: [
      { prompt: '¿Qué ventaja clave aporta dividir puertos y adaptadores en arquitectura limpia?', options: ['Acoplar SQL dentro del JSX', 'Cambiar almacenamiento local por API REST sin reescribir la UI', 'Ocultar errores de compilación'], answer: 1, explanation: 'La inversión de dependencias desacopla la lógica de interfaz de la infraestructura.' },
      { prompt: '¿Qué ventaja aporta TypeScript estricto con contratos compartidos en types/?', options: ['Detecta desajustes de propiedades antes de ejecutar en navegador', 'Elimina la necesidad de pruebas', 'Convierte CSS en JavaScript'], answer: 0, explanation: 'El chequeo estático valida modelos de dominio entre servicios y UI.' },
      { prompt: '¿Dónde debe aplicarse la validación de permisos de forma definitiva?', options: ['Solo ocultando botones en React', 'En el backend para cada endpoint y recurso', 'En el título del documento HTML'], answer: 1, explanation: 'El backend es la frontera de seguridad real; el frontend solo refleja estado y UX.' },
    ],
  },
  fpga: {
    lessons: [
      {
        id: 'fpga-entity',
        title: 'Entidades, puertos y lógica combinacional VHDL',
        summary: 'Define entradas std_logic y síntesis concurrente en tarjetas FPGA.',
        minutes: 8,
        reading: [
          'En VHDL, una entidad declara los pines físicos (std_logic) hacia LEDs o pulsadores, mientras que la arquitectura describe el circuito combinacional concurrente.',
          'Al sintetizar sobre FPGA, las expresiones booleanas como Q <= A AND B se mapean directamente en tablas de consulta (LUTs).',
        ],
        keySteps: [
          'Declara pines de entrada y salida en la entidad VHDL.',
          'Describe asignaciones concurrentes en la arquitectura.',
          'Verifica el estado lógico con entradas A=1 y B=1 en el simulador.',
        ],
        formulaOrCode: `entity and_gate is
  port (A, B : in std_logic; Q : out std_logic);
end entity;
Q <= A and B;`,
        exercise: 'Valida la compuerta AND combinacional en el simulador lógico de la derecha.',
        labKind: 'circuit',
        labGoal: 'Activa AND con A = 1 y B = 1 para comprobar síntesis de nivel alto.',
        labHint: 'Una compuerta AND solo sintetiza salida 1 cuando ambos pines de entrada reciben tensión alta.',
      },
      {
        id: 'fpga-nand',
        title: 'Universalidad NAND y reducción de LUTs',
        summary: 'Construye inversores y sumadores mínimos usando compuertas NAND.',
        minutes: 7,
        reading: [
          'Las compuertas NAND permiten construir cualquier función lógica booleana con menos transistores CMOS.',
          'En diseños embebidos, reducir niveles lógicos disminuye el retardo de propagación entre flip-flops.',
        ],
        keySteps: [
          'Evalúa el complemento lógico de la multiplicación binaria.',
          'Comprueba cuándo se apaga la salida NAND.',
        ],
        formulaOrCode: `Q <= not (A and B);  -- Retardo típico ~1.8 ns en LUT4`,
        exercise: 'Comprueba la condición de apagado de NAND en el simulador.',
        labKind: 'circuit',
        labGoal: 'Selecciona NAND con A = 1 y B = 1 para validar salida en 0.',
        labHint: 'Cambia la compuerta a NAND y asegúrate de tener ambas entradas en 1.',
      },
    ],
    questions: [
      { prompt: '¿En qué bloque de hardware FPGA se mapean las funciones booleanas?', options: ['Look-Up Tables (LUTs)', 'Discos NVMe', 'Servidores DNS'], answer: 0, explanation: 'Las LUTs almacenan las tablas de verdad configurables en el tejido FPGA.' },
      { prompt: '¿Qué salida entrega Q <= not (A and B) cuando A=1 y B=1?', options: ['1 lógico', '0 lógico', 'Alta impedancia'], answer: 1, explanation: 'NAND niega el resultado alto de AND, entregando 0.' },
    ],
  },
  calculus: {
    lessons: [
      {
        id: 'calc-grad',
        title: 'Gradientes, jacobianos y descenso iterativo',
        summary: 'Calcula derivadas parciales para minimizar funciones de pérdida en modelos de IA.',
        minutes: 9,
        reading: [
          'El vector gradiente apunta en la dirección de máximo crecimiento de f(x, y). Al multiplicar por -η (learning rate), descendemos hacia el mínimo de error.',
          'En redes neuronales y regresión lineal normalizada, resolver sistemas por eliminación gaussiana complementa la optimización iterativa.',
        ],
        keySteps: [
          'Plantea las condiciones de optimalidad ∇f(x) = 0 como sistema lineal.',
          'Resuelve el sistema resultante por reducción de Gauss-Jordan.',
        ],
        formulaOrCode: `∇L(w) = [ ∂L/∂w₁, ∂L/∂w₂ ]ᵀ = 0
w_next = w - η · ∇L(w)   (η = learning rate)`,
        exercise: 'Resuelve el sistema lineal de optimalidad [2 1 | 5; 4 3 | 11] en el laboratorio matricial.',
        labKind: 'matrix',
        labGoal: 'Reduce el sistema a I₂ para obtener el punto crítico [x₁=2, x₂=1].',
        labHint: 'Aplica R₂ ← R₂ - 2·R₁, luego normaliza R₁ y limpia hacia arriba.',
      },
    ],
    questions: [
      { prompt: '¿Hacia dónde apunta el negativo del gradiente (-∇f)?', options: ['Dirección de máximo descenso local', 'Dirección ortogonal fija al eje X', 'Siempre hacia infinito'], answer: 0, explanation: 'Por eso el descenso de gradiente actualiza los pesos restando η·∇L.' },
    ],
  },
  nestjs: {
    lessons: [
      {
        id: 'nest-hex',
        title: 'Puertos, casos de uso y adaptadores PostgreSQL en NestJS',
        summary: 'Organiza módulos NestJS con inyección de dependencias sobre interfaces puras.',
        minutes: 8,
        reading: [
          'En Arquitectura Hexagonal con NestJS, los casos de uso dependen de tokens de interfaz (puertos) y nunca de implementaciones directas de TypeORM o Prisma.',
          'Esto permite ejecutar pruebas unitarias en milisegundos con repositorios en memoria y conectar PostgreSQL en producción.',
        ],
        keySteps: [
          'Define entidades y puertos en domain/ sin decoradores HTTP.',
          'Implementa repositorios e integraciones externas en infrastructure/.',
          'Conecta controladores e inyección de dependencias desde el módulo.',
        ],
        formulaOrCode: `@Injectable()
export class EnrollCourseUseCase {
  constructor(@Inject(COURSE_REPO) private readonly repo: CourseRepository) {}
}`,
        exercise: 'Valida las responsabilidades de capas en el validador de arquitectura.',
        labKind: 'architecture',
        labGoal: 'Alinea contratos, servicios I/O y capa reactiva sin fugas.',
        labHint: 'Asegúrate de mantener contratos puros en types/ y el acceso a datos en services/.',
      },
    ],
    questions: [
      { prompt: '¿Qué logra inyectar un puerto en lugar de un repositorio TypeORM concreto?', options: ['Desacoplar lógica de negocio de la base de datos', 'Duplicar consultas SQL', 'Eliminar el tipado'], answer: 0, explanation: 'Permite intercambiar adaptadores y testear casos de uso aislados.' },
    ],
  },
  'algorithms-cpp': {
    lessons: [
      {
        id: 'alg-big-o',
        title: 'Grafos, Dijkstra y análisis asintótico en C++',
        summary: 'Modela listas de adyacencia con std::priority_queue en O((V + E) log V).',
        minutes: 9,
        reading: [
          'Representar grafos dispersos mediante vector<vector<pair<int,int>>> reduce la memoria de O(V²) a O(V + E).',
          'Con un min-heap (std::priority_queue), el algoritmo de Dijkstra encuentra caminos mínimos sin pesos negativos en tiempo cuasi-lineal.',
        ],
        keySteps: [
          'Inicializa distancias en INF y origen en 0.',
          'Relaja aristas salientes manteniendo invariante de menor costo.',
          'Verifica separación modular en el laboratorio de contratos.',
        ],
        formulaOrCode: `priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
// Complejidad: O((V + E) log V)`,
        exercise: 'Comprueba la separación limpia entre modelos, algoritmos/servicios y estado.',
        labKind: 'architecture',
        labGoal: 'Valida la separación de responsabilidades antes de pasar al reto de grafos.',
        labHint: 'Mantén estructuras de datos puras separadas de la capa de I/O.',
      },
    ],
    questions: [
      { prompt: '¿Qué estructura optimiza la extracción del siguiente nodo mínimo en Dijkstra?', options: ['Pila LIFO simple', 'Min-Heap / priority_queue', 'Lista enlazada sin ordenar'], answer: 1, explanation: 'Un min-heap extrae el vértice mínimo en O(log V).' },
    ],
  },
}

export const orientationMaterial: CourseMaterial = {
  lessons: [
    {
      id: 'orientation-plan',
      title: 'Configura tu entorno técnico',
      summary: 'Prepara repositorio, dependencias y objetivos verificables para el módulo.',
      minutes: 5,
      reading: [
        'Esta guía inicial acompaña a los cursos técnicos nuevos mientras se carga el temario extendido. Empieza revisando requisitos de entorno, versiones de runtime y criterios de evaluación.',
        'Define un entregable concreto por semana, como un módulo tipado, una simulación lógica o una demostración matricial.',
      ],
      keySteps: [
        'Aísla tipos, servicios y hooks antes de escribir componentes.',
        'Ejecuta la suite de validación en el entorno interactivo.',
      ],
      formulaOrCode: `npm install && npm run build  // Verifica tsc --noEmit + Vite bundle`,
      exercise: 'Valida la arquitectura base en el panel interactivo de la derecha.',
      labKind: 'architecture',
      labGoal: 'Asigna las 3 capas del entorno y corre la verificación.',
      labHint: 'types/ modela entidades, services/ habla con I/O y hooks/ conecta con UI.',
    },
    {
      id: 'orientation-reflect',
      title: 'Documenta pruebas y hallazgos',
      summary: 'Registra casos de prueba, errores encontrados y la solución aplicada.',
      minutes: 5,
      reading: [
        'Comparar la salida obtenida frente a la esperada permite aislar fallos de lógica, de configuración o de datos.',
        'Cuando consultes al tutor o al docente, comparte el error exacto, el código o cálculo probado y qué resultado esperabas.',
      ],
      keySteps: [
        'Registra entrada, salida esperada y traza observada.',
        'Confirma que la compilación y las pruebas pasan tras el cambio.',
      ],
      formulaOrCode: `expect(actualOutput).toEqual(expectedOutput)`,
      exercise: 'Completa la comprobación de capas y observa la consola de resultados.',
      labKind: 'architecture',
      labGoal: 'Ejecuta la validación del entorno para registrar el caso verificado.',
      labHint: 'Usa las selecciones de cada capa para completar las 3 aserciones.',
    },
  ],
  questions: [
    { prompt: '¿Qué define mejor una meta técnica verificable?', options: ['Leer rápido la documentación', 'Implementar y probar un caso concreto con salida esperada', 'Evitar hacer pruebas'], answer: 1, explanation: 'Una prueba concreta permite verificar si el resultado cumple la especificación.' },
    { prompt: '¿Qué información ayuda más al pedir soporte técnico?', options: ['Solo decir que no funciona', 'Indicar qué probaste, el error exacto y el resultado esperado', 'Omitir el contexto del módulo'], answer: 1, explanation: 'El contexto y la traza permiten diagnosticar la causa raíz.' },
    { prompt: '¿Cómo validas un cambio en un módulo?', options: ['Asumiendo que compila sin probar', 'Ejecutando compilación, tipos y pruebas del flujo afectado', 'Borrando el historial'], answer: 1, explanation: 'Compilación, tipado y prueba funcional confirman la integridad del cambio.' },
  ],
}
