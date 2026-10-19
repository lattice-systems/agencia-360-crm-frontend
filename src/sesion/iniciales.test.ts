import { describe, expect, it } from 'vitest'
import { iniciales } from './iniciales.ts'

describe('Iniciales del perfil', () => {
  it('toma la primera letra del primer nombre y del apellido', () => {
    expect(iniciales('Andrea Ruiz')).toBe('AR')
    expect(iniciales('Persona de Prueba')).toBe('PP')
  })

  it('con un solo nombre usa una letra', () => {
    expect(iniciales('admin')).toBe('A')
  })

  it('respeta los acentos e ignora espacios de más', () => {
    expect(iniciales('  óscar   ramos ')).toBe('ÓR')
  })

  it('sin nombre muestra un signo de interrogación', () => {
    expect(iniciales('   ')).toBe('?')
  })
})
