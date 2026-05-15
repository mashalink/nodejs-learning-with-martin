export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    
	  <div className="min-h-full flex flex-col">
		  <h1 className="text-2xl font-bold mb-4">Dashboard Layout</h1>
        {children}
      </div>
   
  );
}
