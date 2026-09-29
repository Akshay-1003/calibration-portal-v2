import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button, Chip, Input, Label } from "@heroui/react";

export interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  description?: string;
  errorMessage?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  maxTags?: number;
  allowDuplicates?: boolean;
}

const normalizeTag = (value: string) => value.trim();

export function TagsInput({
  value,
  onChange,
  label,
  placeholder,
  description,
  errorMessage,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  maxTags,
  allowDuplicates = false,
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const normalizedValue = useMemo(
    () =>
      Array.isArray(value)
        ? value.map((tag) => String(tag)).filter((tag) => tag.trim().length > 0)
        : [],
    [value]
  );

  const focusInput = useCallback(() => {
    const input = containerRef.current?.querySelector("input");
    input?.focus();
  }, []);

  const addTag = useCallback(
    (rawValue: string) => {
      const nextTag = normalizeTag(rawValue);
      if (!nextTag) return false;

      if (
        !allowDuplicates &&
        normalizedValue.some(
          (tag) => tag.toLocaleLowerCase() === nextTag.toLocaleLowerCase()
        )
      ) {
        return false;
      }

      if (typeof maxTags === "number" && normalizedValue.length >= maxTags) {
        return false;
      }

      onChange([...normalizedValue, nextTag]);
      return true;
    },
    [allowDuplicates, maxTags, normalizedValue, onChange]
  );

  const removeTagAt = useCallback(
    (index: number) => {
      if (isDisabled || isReadOnly) return;
      onChange(normalizedValue.filter((_, tagIndex) => tagIndex !== index));
      setTimeout(focusInput, 0);
    },
    [focusInput, isDisabled, isReadOnly, normalizedValue, onChange]
  );

  const commitInput = useCallback(() => {
    if (isDisabled || isReadOnly) return;
    const didAdd = addTag(inputValue);
    if (didAdd) {
      setInputValue("");
      setTimeout(focusInput, 0);
    }
  }, [addTag, focusInput, inputValue, isDisabled, isReadOnly]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        commitInput();
        return;
      }

      if (event.key === "," && !isDisabled && !isReadOnly) {
        event.preventDefault();
        commitInput();
        return;
      }

      if (
        event.key === "Backspace" &&
        inputValue.trim() === "" &&
        normalizedValue.length > 0 &&
        !isDisabled &&
        !isReadOnly
      ) {
        event.preventDefault();
        removeTagAt(normalizedValue.length - 1);
      }
    },
    [
      commitInput,
      inputValue,
      isDisabled,
      isReadOnly,
      normalizedValue.length,
      removeTagAt,
    ]
  );

  const handleBlur = useCallback(() => {
    if (isDisabled || isReadOnly) return;

    const parts = inputValue
      .split(",")
      .map(normalizeTag)
      .filter((part) => part.length > 0);

    if (parts.length === 0) {
      return;
    }

    let hasChanges = false;

    parts.forEach((part) => {
      const didAdd = addTag(part);
      hasChanges = hasChanges || didAdd;
    });

    if (hasChanges || parts.length > 1) {
      setInputValue("");
    }
  }, [addTag, inputValue, isDisabled, isReadOnly]);

  const isAtLimit =
    typeof maxTags === "number" && normalizedValue.length >= maxTags;

  return (
    <div ref={containerRef} className="w-full">
      {label && <Label className="mb-1 block" isRequired={isRequired}>{label}</Label>}
      <Input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={isDisabled}
        readOnly={isReadOnly || isAtLimit}
        aria-label={label ?? "Tags input"}
      />
      {description && !errorMessage && <p className="mt-1 text-xs text-default-500">{description}</p>}
      {errorMessage && <p className="mt-1 text-xs text-danger">{errorMessage}</p>}

      <div
        className="mt-3 flex flex-wrap gap-2"
        aria-live="polite"
        aria-label={label ? `${label} selected tags` : "Selected tags"}
      >
        {normalizedValue.map((tag, index) => (
          <Chip
            key={`${tag}-${index}`}
            size="sm"
            variant="soft"
            color="accent"
            className="max-w-full rounded-md bg-primary/10 border border-default-200"
          >
            <span className="truncate">{tag}</span>
            {!isDisabled && !isReadOnly && (
              <button type="button" className="ml-1" aria-label={`Remove ${tag}`} onClick={() => removeTagAt(index)}>×</button>
            )}
          </Chip>
        ))}
      </div>

      {typeof maxTags === "number" && (
        <div className="mt-2 flex items-center justify-between text-xs text-default-500">
          <span>{normalizedValue.length} / {maxTags} tags</span>
          {normalizedValue.length > 0 && !isDisabled && !isReadOnly && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onPress={() => {
                onChange([]);
                setInputValue("");
                setTimeout(focusInput, 0);
              }}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default TagsInput;
