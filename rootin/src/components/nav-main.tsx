"use client"

import { motion } from "framer-motion"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url?: string
    icon: React.ReactNode
    isActive?: boolean
    onClick?: () => void
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            isActive={item.isActive}
            onClick={item.onClick}
            render={item.onClick ? <button /> : <a href={item.url} />}
          >
            {item.isActive && (
              <motion.span
                layoutId="nav-active-pill"
                className="nav-active-pill"
                transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.8 }}
              />
            )}
            {item.icon}
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
