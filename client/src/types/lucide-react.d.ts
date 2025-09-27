declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';
  
  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  
  export type LucideIcon = ComponentType<LucideProps>;
  
  // Export all the icons used in the project
  export const Bell: LucideIcon;
  export const Menu: LucideIcon;
  export const Settings: LucideIcon;
  export const Sun: LucideIcon;
  export const Moon: LucideIcon;
  export const Users: LucideIcon;
  export const LogOut: LucideIcon;
  export const Search: LucideIcon;
  export const Filter: LucideIcon;
  export const Coins: LucideIcon;
  export const Plus: LucideIcon;
  export const Edit: LucideIcon;
  export const Trash2: LucideIcon;
  export const X: LucideIcon;
  export const Calendar: LucideIcon;
  export const Download: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const DollarSign: LucideIcon;
  export const ShoppingCart: LucideIcon;
  export const List: LucideIcon;
  export const UserPlus: LucideIcon;
  export const Phone: LucideIcon;
  export const FileText: LucideIcon;
  export const ShoppingBag: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Lock: LucideIcon;
  export const User: LucideIcon;
  export const LogIn: LucideIcon;
  export const Shield: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Home: LucideIcon;
  
  // Additional icons for Sidebar
  export const Layout: LucideIcon;
  export const RepeatIcon: LucideIcon;
  export const CircleDollarSign: LucideIcon;
  export const SquareUserRound: LucideIcon;
  export const UsersRound: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Wallet: LucideIcon;
  export const Building2: LucideIcon;
  export const ArrowRightLeft: LucideIcon;
  
  // Additional icons for Users page
  export const Mail: LucideIcon;
  export const MoreVertical: LucideIcon;
}
