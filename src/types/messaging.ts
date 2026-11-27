/** Archivo adjunto a un mensaje. En la demo se guarda incrustado (data URL). */
export type MessageAttachment = {
  id: string
  name: string
  mime: string
  size: number
  dataUrl: string
}

/** Marca de un mensaje enviado a un grupo: cada integrante recibe su copia y todas comparten el lote. */
export type MessageGroupRef = {
  /** Identifica el grupo (p. ej. «classmates:curso-1»). */
  id: string
  /** Texto visible: «Todo el curso · Python». */
  label: string
  /** Une las copias de un mismo envío. */
  batchId: string
}

/** Mensaje privado entre dos personas (o una copia individual de un envío grupal). */
export type DirectMessage = {
  id: string
  senderId: string
  senderName: string
  recipientId: string
  recipientName: string
  /** Puede ir vacío si el mensaje trae adjuntos. Admite Markdown restringido. */
  text: string
  /** Opcional: los mensajes anteriores a los adjuntos no lo tienen. */
  attachments?: MessageAttachment[]
  /** Opcional: solo los envíos grupales lo tienen. */
  group?: MessageGroupRef
  sentAt: string
  read: boolean
}

export type NewDirectMessage = Pick<DirectMessage, 'senderId' | 'senderName' | 'recipientId' | 'recipientName' | 'text' | 'attachments'>

/** Persona a la que se puede escribir porque comparte al menos un curso. */
export type MessageContact = {
  id: string
  name: string
  role: 'student' | 'teacher'
  email?: string
  courseNames: string[]
}

export type MessageGroupKind = 'all-teachers' | 'course-classmates' | 'course-students' | 'all-students'

/** Destinatario colectivo: varias personas de los cursos del usuario. */
export type MessageGroup = {
  id: string
  kind: MessageGroupKind
  label: string
  description: string
  members: { id: string; name: string }[]
}

export type NewGroupMessage = {
  senderId: string
  senderName: string
  group: Pick<MessageGroup, 'id' | 'label' | 'kind'>
  recipients: { id: string; name: string }[]
  text: string
  attachments?: MessageAttachment[]
}
