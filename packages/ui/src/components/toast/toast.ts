import { createElement } from "react"
import { toast as sonnerToast, type ToasterProps } from "sonner"
import { Toast } from "./Toast"
import type { ToastActionProps, ToastVariant } from "./types"

export type ToastOptions = {
  id?: string | number
  position?: ToasterProps["position"]
  duration?: number
  dismissable?: boolean
  description?: string
  action?: ToastActionProps
}

type PromiseState = string | { title: string; description?: string }

export type PromiseToastProps = {
  loading: PromiseState
  success: PromiseState
  error: PromiseState
  position?: ToasterProps["position"]
  id?: string | number
}

const DEFAULT_POSITION = "top-right" as const

function createUniqueId() {
  return Math.random().toString(36).slice(2, 8)
}

/** The kit's `utils/toast.tsx` counterpart: the `Toast` view is shown through sonner. */
function create(variant: ToastVariant, title: string, options: ToastOptions = {}) {
  const id = options.id ?? createUniqueId()
  sonnerToast.custom(
    () =>
      createElement(Toast, {
        id,
        variant,
        title,
        description: options.description,
        action: options.action,
        dismissable: options.dismissable,
      }),
    {
      id,
      position: options.position,
      duration: options.duration,
      dismissible: options.dismissable,
    },
  )
  return id
}

const titleOf = (state: PromiseState) => (typeof state === "string" ? state : state.title)
const descriptionOf = (state: PromiseState) =>
  typeof state === "string" ? undefined : state.description

function info(title: string, options: ToastOptions = {}) {
  return create("info", title, { position: DEFAULT_POSITION, ...options })
}

function success(title: string, options: ToastOptions = {}) {
  return create("success", title, { position: DEFAULT_POSITION, ...options })
}

function warning(title: string, options: ToastOptions = {}) {
  return create("warning", title, { position: DEFAULT_POSITION, ...options })
}

function error(title: string, options: ToastOptions = {}) {
  return create("error", title, { position: DEFAULT_POSITION, ...options })
}

function loading(title: string, options: ToastOptions = {}) {
  return create("loading", title, {
    position: DEFAULT_POSITION,
    ...options,
    dismissable: options.dismissable ?? false,
  })
}

async function promise<TData>(
  input: Promise<TData> | (() => Promise<TData>),
  props: PromiseToastProps,
) {
  const id = create("loading", titleOf(props.loading), {
    id: props.id,
    position: props.position ?? DEFAULT_POSITION,
    description: descriptionOf(props.loading),
    duration: Number.POSITIVE_INFINITY,
    dismissable: false,
  })

  try {
    await (typeof input === "function" ? input() : input)
    success(titleOf(props.success), {
      id,
      position: props.position,
      description: descriptionOf(props.success),
    })
  } catch {
    error(titleOf(props.error), {
      id,
      position: props.position,
      description: descriptionOf(props.error),
    })
  }

  return id
}

export const toast = Object.assign(info, {
  info,
  success,
  warning,
  error,
  loading,
  promise,
  dismiss: sonnerToast.dismiss,
})
