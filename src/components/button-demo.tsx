import { Button } from "@/components/ui/button"
import { ChevronRight } from 'lucide-react';

export function ButtonDemo() {
  return (
    <div className="flex flex-wrap gap-4">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button disabled>Disabled</Button>
      <Button size="lg">Large</Button>
      <Button size="sm">Small</Button>
      <Button size="icon">
        <ChevronRight className="h-4 w-4" />
      </Button>
       <Button>
         <ChevronRight className="mr-2 h-4 w-4" /> With Icon
      </Button>
    </div>
  )
} 