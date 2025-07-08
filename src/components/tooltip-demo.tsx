import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export default function TooltipDemo() {
  return (
    <div className="flex items-center space-x-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Hover</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add to library</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Settings</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Adjust your preferences</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary">Profile</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View your profile</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
} 