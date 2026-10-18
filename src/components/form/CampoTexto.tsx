import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { TextField, type TextFieldProps } from '@/components/ui/TextField';

export interface CampoTextoProps<T extends FieldValues, R> extends Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> {
  control: Control<T, unknown, R>;
  name: FieldPath<T>;
}

/** `TextField` conectado a react-hook-form: muestra el error de validación del campo. */
export function CampoTexto<T extends FieldValues, R>({
  control,
  name,
  ...props
}: CampoTextoProps<T, R>) {
  const {
    field: { ref, value, onChange, onBlur },
    fieldState: { error },
  } = useController({ control, name });
  return (
    <TextField
      {...props}
      ref={ref}
      value={typeof value === 'string' ? value : ''}
      onChangeText={onChange}
      onBlur={onBlur}
      error={error?.message}
    />
  );
}
