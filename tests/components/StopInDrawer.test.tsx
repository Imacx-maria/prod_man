import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StopInDrawer from '@/components/StopInDrawer';

describe('StopInDrawer', () => {
  it('renders children correctly', () => {
    render(
      <StopInDrawer>
        <button>Test Button</button>
      </StopInDrawer>
    );
    
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('stops propagation when inside a drawer', () => {
    // Create a mock function for the event handler
    const mockParentHandler = jest.fn();
    
    // Create a mock drawer structure
    const { container } = render(
      <div data-drawer="true" onPointerDown={mockParentHandler}>
        <StopInDrawer>
          <button>Test Button</button>
        </StopInDrawer>
      </div>
    );
    
    // Fire a pointerdown event on the button
    fireEvent.pointerDown(screen.getByText('Test Button'));
    
    // The parent handler should not be called because propagation was stopped
    expect(mockParentHandler).not.toHaveBeenCalled();
  });

  it('does not stop propagation when not inside a drawer', () => {
    // Create a mock function for the event handler
    const mockParentHandler = jest.fn();
    
    // Create a structure without the drawer attribute
    const { container } = render(
      <div onPointerDown={mockParentHandler}>
        <StopInDrawer>
          <button>Test Button</button>
        </StopInDrawer>
      </div>
    );
    
    // Fire a pointerdown event on the button
    fireEvent.pointerDown(screen.getByText('Test Button'));
    
    // The parent handler should be called because propagation was not stopped
    expect(mockParentHandler).toHaveBeenCalled();
  });

  it('works with asChild prop', () => {
    // Create a mock function for the event handler
    const mockParentHandler = jest.fn();
    const mockChildHandler = jest.fn();
    
    // Create a mock drawer structure with asChild
    const { container } = render(
      <div data-drawer="true" onPointerDown={mockParentHandler}>
        <StopInDrawer asChild>
          <button onPointerDown={mockChildHandler}>Test Button</button>
        </StopInDrawer>
      </div>
    );
    
    // Fire a pointerdown event on the button
    fireEvent.pointerDown(screen.getByText('Test Button'));
    
    // The parent handler should not be called because propagation was stopped
    expect(mockParentHandler).not.toHaveBeenCalled();
    
    // The child handler should still be called
    expect(mockChildHandler).toHaveBeenCalled();
  });

  it('preserves className when used with asChild', () => {
    render(
      <StopInDrawer asChild className="test-class">
        <button className="button-class">Test Button</button>
      </StopInDrawer>
    );
    
    const button = screen.getByText('Test Button');
    expect(button).toHaveClass('button-class');
    expect(button).toHaveClass('test-class');
  });
}); 