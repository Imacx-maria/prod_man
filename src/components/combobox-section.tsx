"use client";

import Combobox from "@/components/ui/Combobox";
import { useState } from "react";

const ComboboxSection = () => {
  const [value, setValue] = useState("");

  return (
    <section>
      <h2 className="mb-6 text-2xl font-bold">Combobox</h2>
      <Combobox
        value={value}
        onChange={setValue}
        placeholder="Demo combobox"
        options={[
          { value: "next", label: "Next.js" },
          { value: "react", label: "React" },
          { value: "vue", label: "Vue" },
          { value: "svelte", label: "Svelte" }
        ]}
      />
    </section>
  );
};

export default ComboboxSection; 