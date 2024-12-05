"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calculator, Calendar, CreditCard, Settings, Smile, User } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Escribe un comando o busca..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        <CommandGroup heading="Sugerencias">
          <CommandItem
            onSelect={() => {
              runCommand(() => router.push("/docs"))
            }}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Documentación</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              runCommand(() => router.push("/settings"))
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Configuración</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Herramientas">
          <CommandItem
            onSelect={() => {
              runCommand(() => router.push("/calendar"))
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span>Calendario</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              runCommand(() => router.push("/calculator"))
            }}
          >
            <Calculator className="mr-2 h-4 w-4" />
            <span>Calculadora</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              runCommand(() => router.push("/emoji"))
            }}
          >
            <Smile className="mr-2 h-4 w-4" />
            <span>Emojis</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
} 