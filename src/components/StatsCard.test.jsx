import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsCard from './StatsCard'
import { Users } from 'lucide-react'

describe('StatsCard', () => {
  it('should render label and value', () => {
    render(<StatsCard label="Total Users" value={100} />)

    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('should format value as percentage', () => {
    render(<StatsCard label="Rate" value={75} format="percent" />)

    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('should format value as currency', () => {
    render(<StatsCard label="Revenue" value={1500} format="currency" />)

    expect(screen.getByText('1500EUR')).toBeInTheDocument()
  })

  it('should show positive change indicator', () => {
    render(<StatsCard label="Growth" value={100} change={15} />)

    expect(screen.getByText('+15% vs mois dernier')).toBeInTheDocument()
  })

  it('should show negative change indicator', () => {
    render(<StatsCard label="Decline" value={100} change={-10} />)

    expect(screen.getByText('-10% vs mois dernier')).toBeInTheDocument()
  })

  it('should render with icon', () => {
    const { container } = render(
      <StatsCard label="Users" value={50} icon={Users} />
    )

    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
