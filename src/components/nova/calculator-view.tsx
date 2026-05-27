'use client'

import { motion } from 'framer-motion'
import { Calculator, ArrowRightLeft, Trash2, RefreshCw, Clock, History } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CNY: 7.24,
  AED: 3.67,
  SAR: 3.75,
  INR: 83.12,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.88,
}

const LENGTH_UNITS = ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi']
const LENGTH_TO_M: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 }

const WEIGHT_UNITS = ['mg', 'g', 'kg', 'lb', 'oz']
const WEIGHT_TO_G: Record<string, number> = { mg: 0.001, g: 1, kg: 1000, lb: 453.592, oz: 28.3495 }

type ConverterTab = 'currency' | 'length' | 'weight' | 'temperature'

interface ConversionRecord {
  id: string
  from: string
  to: string
  amount: string
  result: string
  timestamp: Date
  type: ConverterTab
}

function evaluate(expression: string): number {
  const sanitized = expression.replace(/[^0-9+\-*/().%]/g, '')
  if (!sanitized) return 0
  try {
    return new Function(`return (${sanitized})`)()
  } catch {
    return 0
  }
}

export function CalculatorView() {
  const [display, setDisplay] = useState('0')
  const [prevValue, setPrevValue] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<ConverterTab>('currency')

  // Exchange rate state
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>(FALLBACK_RATES)
  const [ratesTimestamp, setRatesTimestamp] = useState<string | null>(null)
  const [ratesSource, setRatesSource] = useState<string>('fallback')
  const [isRatesLoading, setIsRatesLoading] = useState(false)
  const [ratesFallback, setRatesFallback] = useState(true)

  // Conversion history
  const [conversionHistory, setConversionHistory] = useState<ConversionRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Converter state
  const [convertFrom, setConvertFrom] = useState('USD')
  const [convertTo, setConvertTo] = useState('EUR')
  const [convertAmount, setConvertAmount] = useState('1')

  // Fetch exchange rates
  const fetchRates = useCallback(async () => {
    setIsRatesLoading(true)
    try {
      const response = await fetch('/api/exchange-rates')
      if (response.ok) {
        const data = await response.json()
        if (data.rates) {
          setCurrencyRates(data.rates)
          setRatesTimestamp(data.timestamp)
          setRatesSource(data.source || 'unknown')
          setRatesFallback(data.fallback === true)
        }
      }
    } catch {
      // Offline or error — keep last cached rates
    } finally {
      setIsRatesLoading(false)
    }
  }, [])

  // Fetch rates on mount
  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? digit : display + digit)
    }
  }

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
      return
    }
    if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }

  const handleOperator = (nextOperator: string) => {
    const inputValue = parseFloat(display)
    if (prevValue !== null && operator && !waitingForOperand) {
      const result = calculate(prevValue, inputValue, operator)
      setDisplay(String(result))
      setPrevValue(result)
    } else {
      setPrevValue(inputValue)
    }
    setOperator(nextOperator)
    setWaitingForOperand(true)
  }

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b
      case '-': return a - b
      case '×': return a * b
      case '÷': return b !== 0 ? a / b : 0
      default: return b
    }
  }

  const handleEquals = () => {
    if (prevValue === null || operator === null) return
    const inputValue = parseFloat(display)
    const result = calculate(prevValue, inputValue, operator)
    const expression = `${prevValue} ${operator} ${inputValue} = ${result}`
    setHistory(prev => [expression, ...prev].slice(0, 20))
    setDisplay(String(result))
    setPrevValue(null)
    setOperator(null)
    setWaitingForOperand(true)
  }

  const handleClear = () => {
    setDisplay('0')
    setPrevValue(null)
    setOperator(null)
    setWaitingForOperand(false)
  }

  const handlePlusMinus = () => {
    const val = parseFloat(display)
    setDisplay(String(-val))
  }

  const handlePercent = () => {
    const val = parseFloat(display)
    setDisplay(String(val / 100))
  }

  // Converter logic
  const getConvertResult = (): string => {
    const amount = parseFloat(convertAmount) || 0
    switch (activeTab) {
      case 'currency': {
        const fromRate = currencyRates[convertFrom] || 1
        const toRate = currencyRates[convertTo] || 1
        return ((amount / fromRate) * toRate).toFixed(2)
      }
      case 'length': {
        const fromM = (LENGTH_TO_M[convertFrom] || 1) * amount
        const toM = LENGTH_TO_M[convertTo] || 1
        return (fromM / toM).toFixed(4)
      }
      case 'weight': {
        const fromG = (WEIGHT_TO_G[convertFrom] || 1) * amount
        const toG = WEIGHT_TO_G[convertTo] || 1
        return (fromG / toG).toFixed(4)
      }
      case 'temperature': {
        if (convertFrom === 'C' && convertTo === 'F') return ((amount * 9/5) + 32).toFixed(2)
        if (convertFrom === 'F' && convertTo === 'C') return ((amount - 32) * 5/9).toFixed(2)
        if (convertFrom === 'C' && convertTo === 'K') return (amount + 273.15).toFixed(2)
        if (convertFrom === 'K' && convertTo === 'C') return (amount - 273.15).toFixed(2)
        return amount.toFixed(2)
      }
      default: return '0'
    }
  }

  const handleSaveConversion = () => {
    const result = getConvertResult()
    const record: ConversionRecord = {
      id: `conv-${Date.now()}`,
      from: convertFrom,
      to: convertTo,
      amount: convertAmount,
      result,
      timestamp: new Date(),
      type: activeTab,
    }
    setConversionHistory(prev => [record, ...prev].slice(0, 50))
  }

  const getUnits = (): string[] => {
    switch (activeTab) {
      case 'currency': return Object.keys(currencyRates)
      case 'length': return LENGTH_UNITS
      case 'weight': return WEIGHT_UNITS
      case 'temperature': return ['C', 'F', 'K']
      default: return []
    }
  }

  const calcButtons = [
    ['C', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
  ]

  const formatTimestamp = (ts: string): string => {
    try {
      const date = new Date(ts)
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ts
    }
  }

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 overflow-y-auto">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calculator className="w-5 h-5 text-nova-gold" />
          Calculator & Converter
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calculator */}
        <div className="glass-card p-5">
          <div className="mb-4 p-4 rounded-lg bg-[#0d0d0d] border border-border">
            <div className="text-right">
              {operator && prevValue !== null && (
                <p className="text-xs text-muted-foreground">{prevValue} {operator}</p>
              )}
              <p className="text-3xl font-bold text-nova-gold gold-glow-text truncate">{display}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {calcButtons.flat().map(btn => (
              <motion.button
                key={btn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (btn === 'C') handleClear()
                  else if (btn === '±') handlePlusMinus()
                  else if (btn === '%') handlePercent()
                  else if (btn === '=') handleEquals()
                  else if (['+', '-', '×', '÷'].includes(btn)) handleOperator(btn)
                  else if (btn === '.') inputDecimal()
                  else inputDigit(btn)
                }}
                className={`p-3 rounded-lg text-sm font-semibold transition-colors ${
                  btn === '0' ? 'col-span-2' : ''
                } ${
                  ['÷', '×', '-', '+'].includes(btn)
                    ? 'bg-nova-gold/10 text-nova-gold hover:bg-nova-gold/20'
                    : ['C', '±', '%'].includes(btn)
                    ? 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                    : ['='].includes(btn)
                    ? 'gold-gradient-bg text-background'
                    : 'bg-secondary/20 text-foreground hover:bg-secondary/40'
                }`}
              >
                {btn}
              </motion.button>
            ))}
          </div>

          {history.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">History</span>
                <button onClick={() => setHistory([])} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {history.map((h, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground font-mono">{h}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Converter */}
        <div className="glass-card p-5">
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {(['currency', 'length', 'weight', 'temperature'] as ConverterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab)
                  setConvertFrom(getUnitsForTab(tab)[0])
                  setConvertTo(getUnitsForTab(tab)[1])
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition-colors ${
                  activeTab === tab ? 'gold-gradient-bg text-background' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Currency rates header with refresh */}
          {activeTab === 'currency' && (
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {ratesTimestamp ? formatTimestamp(ratesTimestamp) : 'Loading...'}
                {ratesFallback && (
                  <span className="text-amber-500 ml-1">(cached)</span>
                )}
                {!ratesFallback && ratesSource && (
                  <span className="text-emerald-500 ml-1">● Live</span>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchRates}
                disabled={isRatesLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-nova-gold hover:bg-nova-gold/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRatesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
              <input
                type="number"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold"
              />
            </div>
            <div className="grid grid-cols-5 gap-2 items-end">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">From</label>
                <select value={convertFrom} onChange={(e) => setConvertFrom(e.target.value)} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                  {getUnits().map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4 text-nova-gold" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">To</label>
                <select value={convertTo} onChange={(e) => setConvertTo(e.target.value)} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                  {getUnits().map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#0d0d0d] border border-border text-center">
              <p className="text-xs text-muted-foreground mb-1">{convertAmount} {convertFrom} =</p>
              <p className="text-2xl font-bold text-nova-gold gold-glow-text">{getConvertResult()} {convertTo}</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveConversion}
                className="mt-2 text-[10px] text-muted-foreground hover:text-nova-gold transition-colors"
              >
                Save to history
              </motion.button>
            </div>

            {activeTab === 'currency' && (
              <div className="space-y-1.5 mt-2">
                <p className="text-xs text-muted-foreground">Rates (base: USD)</p>
                {Object.entries(currencyRates).map(([currency, rate]) => (
                  <div key={currency} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{currency}</span>
                    <span className="text-foreground font-mono">{typeof rate === 'number' ? rate.toFixed(rate >= 1 ? 2 : 4) : rate}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Conversion History */}
            {conversionHistory.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-nova-gold transition-colors"
                  >
                    <History className="w-3 h-3" />
                    Conversion History ({conversionHistory.length})
                  </button>
                  {showHistory && (
                    <button onClick={() => setConversionHistory([])} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {showHistory && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {conversionHistory.map(record => (
                      <div key={record.id} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-secondary/20">
                        <span className="text-foreground font-mono">
                          {record.amount} {record.from} → {record.result} {record.to}
                        </span>
                        <span className="text-muted-foreground">
                          {record.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getUnitsForTab(tab: ConverterTab): string[] {
  switch (tab) {
    case 'currency': return ['USD', 'EUR']
    case 'length': return ['m', 'ft']
    case 'weight': return ['kg', 'lb']
    case 'temperature': return ['C', 'F']
    default: return ['USD', 'EUR']
  }
}
