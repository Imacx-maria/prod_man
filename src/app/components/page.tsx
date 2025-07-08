import { TabsDemo } from "@/components/tabs-demo";
import { ButtonDemo } from "@/components/button-demo";
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Combobox from "@/components/ui/Combobox"
import DialogDemo from "@/components/dialog-demo"
import DrawerDemo from "@/components/drawer-demo"
import PaginationDemo from "@/components/pagination-demo"
import ProgressDemo from "@/components/progress-demo"
import SelectDemo from "@/components/select-demo";
import SwitchDemo from "@/components/switch-demo";
import TableDemo from "@/components/table-demo";
import TooltipDemo from "@/components/tooltip-demo";
import DataTableDemo from "@/components/data-table-demo";
import InputDemo from "@/components/input-demo";
import ComboboxSection from "@/components/combobox-section";

export default function ComponentsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-12 text-3xl font-bold">Component Library</h1>

      <div className="space-y-12">
        <section>
          <h2 className="mb-6 text-2xl font-bold">Tabs</h2>
          <TabsDemo />
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold">Buttons</h2>
          <ButtonDemo />
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold">Card</h2>
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>
                Enter your email below to login to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <a
                        href="#"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </a>
                    </div>
                    <Input id="password" type="password" required />
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button 
                type="submit" 
                className="w-full"
              >
                Login
              </Button>
              <Button variant="secondary" className="w-full">
                Login with Google
              </Button>
              <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{" "}
                <a href="#" className="underline underline-offset-4">
                  Sign up
                </a>
              </div>
            </CardFooter>
          </Card>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold">Checkbox</h2>
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" />
            <Label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Accept terms and conditions
            </Label>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold">Combobox</h2>
          <ComboboxSection />
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold">Dialog</h2>
          <DialogDemo />
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold">Drawer</h2>
          <DrawerDemo />
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold">Pagination</h2>
          <PaginationDemo />
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold">Progress</h2>
          <ProgressDemo />
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold">Input</h2>
          <InputDemo />
        </section>

        <section>
          <h2 className="mb-6 text-xl font-bold">Select</h2>
          <SelectDemo />
        </section>

        <section>
          <h2 className="mb-6 text-xl font-bold">Switch</h2>
          <SwitchDemo />
        </section>

        <section>
          <h2 className="mb-6 text-xl font-bold">Table</h2>
          <TableDemo />
        </section>

        <section>
          <h2 className="mb-6 text-xl font-bold">Paragraph</h2>
          <p className="font-base text-sm text-foreground">
            Este é um exemplo de parágrafo usando as classes padrão do projeto para texto: <code>font-base text-sm text-foreground</code>.<br />
            O texto se adapta automaticamente ao modo claro e escuro, e é consistente com as células das tabelas e outros textos do sistema.
          </p>
        </section>

        <section>
          <h2 className="mb-6 text-xl font-bold">Tooltip</h2>
          <TooltipDemo />
        </section>

        <section>
          <h2 className="mb-6 text-xl font-bold">Data Table</h2>
          <DataTableDemo />
        </section>
      </div>
    </div>
  );
} 