'use client'

import React from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxWidth?: number | string
}

export function SearchInput({ value, onChange, placeholder = 'Search...', maxWidth }: SearchInputProps) {
  return (
    <div className="upward-search-box" style={{ maxWidth }}>
      <Search size={18} className="upward-search-box__icon" />
      <input 
        type="text" 
        className="upward-search-box__input" 
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
