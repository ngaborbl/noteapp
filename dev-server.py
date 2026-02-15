#!/usr/bin/env python3
"""
NO-CACHE HTTP Server for Development
Teljesen kikapcsolja a cache-elést minden fájlnál
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import sys

class NoCacheHTTPRequestHandler(SimpleHTTPRequestHandler):
    """HTTP handler ami kikapcsolja a cache-elést"""
    
    def end_headers(self):
        """Hozzáadja a no-cache headereket MINDEN válaszhoz"""
        # Cache kikapcsolása
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        # CORS engedélyezése (ha kell)
        self.send_header('Access-Control-Allow-Origin', '*')
        
        # Eredeti end_headers hívása
        SimpleHTTPRequestHandler.end_headers(self)
    
    def log_message(self, format, *args):
        """Színes log üzenetek"""
        # Zöld színnel írja ki a kéréseket
        sys.stderr.write("\033[92m%s - - [%s] %s\033[0m\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format % args))

def run_server(port=8000):
    """Szerver indítása"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, NoCacheHTTPRequestHandler)
    
    print(f"\n🚀 NO-CACHE Development Server futtatása...")
    print(f"📂 Könyvtár: {os.getcwd()}")
    print(f"🌐 URL: http://localhost:{port}")
    print(f"🔥 Cache: KIKAPCSOLVA (minden fájl friss!)")
    print(f"\n⚡ Nyomd meg Ctrl+C a leállításhoz\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Szerver leállítva\n")
        httpd.server_close()

if __name__ == '__main__':
    # Port beállítása (alapértelmezett: 8000)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    
    # Szerver indítása
    run_server(port)
