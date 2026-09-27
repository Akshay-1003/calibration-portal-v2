import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button, Chip, Input } from "@heroui/react";

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
      <Input
        value={inputValue}
        onValueChange={setInputValue}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        label={label}
        placeholder={placeholder}
        description={description}
        errorMessage={errorMessage}
        isInvalid={Boolean(errorMessage)}
        isRequired={isRequired}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly || isAtLimit}
        aria-label={label ?? "Tags input"}
      />

      <div
        className="mt-3 flex flex-wrap gap-2"
        aria-live="polite"
        aria-label={label ? `${label} selected tags` : "Selected tags"}
      >
        {normalizedValue.map((tag, index) => (
          <Chip
            key={`${tag}-${index}`}
            size="sm"
            variant="flat"
            color="primary"
            onClose={() => removeTagAt(index)}
            className="max-w-full rounded-md bg-primary/10 border border-default-200"
          >
            <span className="truncate">{tag}</span>
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
              variant="light"
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
