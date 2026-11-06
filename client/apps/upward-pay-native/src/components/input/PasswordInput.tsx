import { Input } from '@/components/input/Input'

type PasswordInputProps = {
  label?: string
  value: string
  onChangeText: (value: string) => void
  error?: string
  placeholder?: string
  autoComplete?: 'password' | 'new-password'
}

export function PasswordInput({
  label = 'Password',
  value,
  onChangeText,
  error,
  placeholder = 'Enter your password',
  autoComplete = 'password',
}: PasswordInputProps) {
  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChangeText}
      error={error}
      placeholder={placeholder}
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      textContentType="password"
    />
  )
}
