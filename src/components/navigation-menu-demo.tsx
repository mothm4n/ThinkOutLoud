"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ModeToggle } from "@/components/mode-toggle"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

// Componente para los links del menú
const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"

export function NavigationMenuDemo() {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <Image
          src="/icon.png"
          alt="ThinkOutLoud Logo"
          width={32}
          height={32}
          className="rounded-sm"
        />
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Inicio</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                  <li className="row-span-3">
                    <NavigationMenuLink asChild>
                      <a
                        className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                        href="/"
                      >
                        <div className="mb-2 mt-4 text-lg font-medium">
                          ThinkOutLoud
                        </div>
                        <p className="text-sm leading-tight text-muted-foreground">
                          Tu espacio para pensar en voz alta
                        </p>
                      </a>
                    </NavigationMenuLink>
                  </li>
                  <ListItem href="/docs" title="Documentación">
                    Aprende a usar todas las funcionalidades
                  </ListItem>
                  <ListItem href="/docs/installation" title="Instalación">
                    Cómo empezar con ThinkOutLoud
                  </ListItem>
                  <ListItem href="/docs/primitives" title="Componentes">
                    Explora los componentes disponibles
                  </ListItem>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Componentes</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                  {components.map((component) => (
                    <ListItem
                      key={component.title}
                      title={component.title}
                      href={component.href}
                    >
                      {component.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/docs" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Documentación
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <ModeToggle />
    </div>
  )
}

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Alertas",
    href: "/docs/primitives/alert",
    description:
      "Un componente que muestra un mensaje importante a los usuarios.",
  },
  {
    title: "Badges",
    href: "/docs/primitives/badge",
    description:
      "Etiquetas compactas para mostrar estados o metadatos.",
  },
  {
    title: "Cards",
    href: "/docs/primitives/card",
    description:
      "Contenedores versátiles para mostrar contenido relacionado.",
  },
  {
    title: "Diálogos",
    href: "/docs/primitives/dialog",
    description:
      "Ventanas modales para mostrar contenido importante.",
  },
] 