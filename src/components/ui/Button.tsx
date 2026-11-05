// Shared large button; props are named arguments, like Python keyword arguments.
// "danger" is for actions that delete something (always behind a ConfirmDialog).
// In React 19 `ref` is a normal prop, so a parent can focus the button.
import type { ButtonHTMLAttributes, Ref } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={`button button-${variant} ${className}`} {...props} />;
}
