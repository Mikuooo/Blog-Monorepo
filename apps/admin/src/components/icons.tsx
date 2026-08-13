import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  Clock3,
  Eye,
  FileText,
  Folder,
  Image,
  LayoutDashboard,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Tag,
  User,
  Users,
  X,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

export type IconName =
  | 'arrow-up-right'
  | 'bell'
  | 'chevron-down'
  | 'clock'
  | 'dashboard'
  | 'eye'
  | 'file-text'
  | 'folder'
  | 'image'
  | 'menu'
  | 'message'
  | 'more'
  | 'plus'
  | 'search'
  | 'settings'
  | 'tag'
  | 'user'
  | 'users'
  | 'x'

const icons: Record<IconName, LucideIcon> = {
  'arrow-up-right': ArrowUpRight,
  bell: Bell,
  'chevron-down': ChevronDown,
  clock: Clock3,
  dashboard: LayoutDashboard,
  eye: Eye,
  'file-text': FileText,
  folder: Folder,
  image: Image,
  menu: Menu,
  message: MessageSquare,
  more: MoreHorizontal,
  plus: Plus,
  search: Search,
  settings: Settings,
  tag: Tag,
  user: User,
  users: Users,
  x: X,
}

export function Icon({ name, ...props }: LucideProps & { name: IconName }) {
  const LucideIconComponent = icons[name]

  return <LucideIconComponent aria-hidden="true" strokeWidth={1.8} {...props} />
}
