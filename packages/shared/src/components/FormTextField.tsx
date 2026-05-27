import { useState, type ChangeEvent } from 'react'

type FormTextFieldProps = {
  label: string
  name: string
  hint: string
  defaultValue?: string
  multiline?: boolean
  rows?: number
  className?: string
  inputClassName?: string
}

const inputBaseClass =
  'px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500'

const FormTextField = ({
  label,
  name,
  hint,
  defaultValue = '',
  multiline = false,
  rows = 3,
  className = '',
  inputClassName = '',
}: FormTextFieldProps) => {
  const [value, setValue] = useState(defaultValue)
  const hasText = value.length > 0
  const controlClass = [inputBaseClass, inputClassName].filter(Boolean).join(' ')
  const hintId = `${name}-hint`

  const controlProps = {
    name,
    className: controlClass,
    value,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValue(e.target.value),
    placeholder: hint,
    ...(hasText ? { 'aria-describedby': hintId } : {}),
  }

  return (
    <label className={`flex flex-col ${className}`.trim()}>
      {label}
      {multiline ? (
        <textarea {...controlProps} rows={rows} />
      ) : (
        <input type="text" {...controlProps} />
      )}
      <span
        id={hintId}
        className={`text-xs text-gray-500 mt-1 ${hasText ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden={!hasText}
      >
        {hint}
      </span>
    </label>
  )
}

export default FormTextField
