import Combobox from "./Combobox";

interface ComplexidadeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function ComplexidadeCombobox({
  value,
  onChange,
  options,
  placeholder = "Selecione complexidade",
  disabled = false,
  loading = false,
}: ComplexidadeComboboxProps) {
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled || loading}
    />
  );
} 