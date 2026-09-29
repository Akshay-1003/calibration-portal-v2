import { render, screen } from '@testing-library/react';
import { Input } from '@heroui/react';
import { describe, expect, it } from 'vitest';
import { FormField } from '../../components/ui/form-field';

describe('FormField layout contract', () => {
  it('keeps HeroUI inputs inside a full-width control wrapper', () => {
    render(
      <FormField label="Client">
        <Input aria-label="Client" placeholder="Select client" />
      </FormField>,
    );

    const input = screen.getByLabelText('Client');
    expect(input.parentElement?.className).toContain('w-full');
  });
});
