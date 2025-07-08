import { FileInfo, API, JSXElement, JSXIdentifier, Collection } from 'jscodeshift';

/**
 * Codemod to wrap all <PopoverTrigger> and <Button> components inside drawers
 * with <StopInDrawer> to prevent drawer closing when interacting with these elements.
 * 
 * Usage:
 * npx jscodeshift -t drawer-codemod.ts src/app/producao/page.tsx --parser=tsx
 */
export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  
  // Flag to track if we need to add the import
  let needsImport = false;
  
  // Check if StopInDrawer is already imported
  const hasStopInDrawerImport = root
    .find(j.ImportDeclaration)
    .some((path: any) => {
      return path.node.source.value === '@/components/StopInDrawer' ||
             (path.node.source.value === '@/components' && 
              path.node.specifiers.some((spec: any) => 
                spec.type === 'ImportSpecifier' && 
                spec.imported.name === 'StopInDrawer'
              ));
    });
  
  /**
   * Helper function to check if a JSX element is inside a drawer
   */
  function isInsideDrawer(path: any): boolean {
    // Walk up the tree to find if any parent is a DrawerContent
    let current = path;
    while (current.parent) {
      // Check if the parent is a JSX element with name DrawerContent
      if (current.parent.node.type === 'JSXElement' && 
          current.parent.node.openingElement.name.type === 'JSXIdentifier' &&
          current.parent.node.openingElement.name.name === 'DrawerContent') {
        return true;
      }
      
      // Move up to the parent
      current = current.parent;
    }
    
    return false;
  }
  
  // Find all <PopoverTrigger> elements inside drawers
  root.find(j.JSXElement, {
    openingElement: {
      name: {
        type: 'JSXIdentifier',
        name: 'PopoverTrigger'
      }
    }
  })
  .filter((path: any) => isInsideDrawer(path))
  .forEach((path: any) => {
    // If this PopoverTrigger is not already wrapped by StopInDrawer
    if (path.parent.node.type !== 'JSXElement' || 
        path.parent.node.openingElement.name.type !== 'JSXIdentifier' ||
        path.parent.node.openingElement.name.name !== 'StopInDrawer') {
      
      // Mark that we need to add the import
      needsImport = true;
      
      // Create a StopInDrawer element to wrap the current element
      const stopInDrawer = j.jsxElement(
        j.jsxOpeningElement(j.jsxIdentifier('StopInDrawer'), []),
        j.jsxClosingElement(j.jsxIdentifier('StopInDrawer')),
        [path.node]
      );
      
      // Replace the current element with the wrapped version
      j(path).replaceWith(stopInDrawer);
    }
  });
  
  // Find all <Button> elements inside drawers
  root.find(j.JSXElement, {
    openingElement: {
      name: {
        type: 'JSXIdentifier',
        name: 'Button'
      }
    }
  })
  .filter((path: any) => isInsideDrawer(path))
  .forEach((path: any) => {
    // If this Button is not already wrapped by StopInDrawer
    if (path.parent.node.type !== 'JSXElement' || 
        path.parent.node.openingElement.name.type !== 'JSXIdentifier' ||
        path.parent.node.openingElement.name.name !== 'StopInDrawer') {
      
      // Skip if this Button is already inside a PopoverTrigger, as we're already wrapping those
      if (path.parent.node.type === 'JSXElement' &&
          path.parent.node.openingElement.name.type === 'JSXIdentifier' &&
          path.parent.node.openingElement.name.name === 'PopoverTrigger') {
        return;
      }
      
      // Mark that we need to add the import
      needsImport = true;
      
      // Add asChild prop to StopInDrawer for buttons
      const stopInDrawer = j.jsxElement(
        j.jsxOpeningElement(
          j.jsxIdentifier('StopInDrawer'), 
          [j.jsxAttribute(j.jsxIdentifier('asChild'))],
          false
        ),
        j.jsxClosingElement(j.jsxIdentifier('StopInDrawer')),
        [path.node]
      );
      
      // Replace the current element with the wrapped version
      j(path).replaceWith(stopInDrawer);
    }
  });
  
  // Add import statement if needed
  if (needsImport && !hasStopInDrawerImport) {
    const importStatement = j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier('StopInDrawer'))],
      j.stringLiteral('@/components/StopInDrawer')
    );
    
    // Find the last import declaration
    const lastImport = root.find(j.ImportDeclaration).at(-1);
    
    if (lastImport.size() > 0) {
      // Add after the last import
      lastImport.insertAfter(importStatement);
    } else {
      // Add at the beginning of the file
      root.get().node.program.body.unshift(importStatement);
    }
  }
  
  return root.toSource();
} 