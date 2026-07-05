import ast
import os
import sys

def get_imports(directory):
    imports = set()
    skip_dirs = {'.venv', 'venv', '__pycache__', 'migrations', 'node_modules', '.git', '.next'}
    
    for root, dirs, files in os.walk(directory):
        # Modify dirs in-place to skip unwanted directories
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        tree = ast.parse(f.read(), filename=path)
                        for node in ast.walk(tree):
                            if isinstance(node, ast.Import):
                                for alias in node.names:
                                    imports.add(alias.name.split('.')[0])
                            elif isinstance(node, ast.ImportFrom):
                                if node.module and node.level == 0:
                                    imports.add(node.module.split('.')[0])
                except Exception:
                    pass
    return imports

if __name__ == '__main__':
    all_imports = get_imports('.')
    
    try:
        stdlib = set(sys.stdlib_module_names)
    except AttributeError:
        import distutils.sysconfig as sysconfig
        import glob
        std_lib = sysconfig.get_python_lib(standard_lib=True)
        stdlib = {os.path.splitext(os.path.basename(f))[0] for f in glob.glob(std_lib + '/*.py')}
    
    # Internal apps to ignore if they match top level folders
    internal = {'apps', 'config', 'manage', 'tests', 'utils', 'backend', 'frontend'}
    
    third_party = sorted([m for m in all_imports if m not in stdlib and m not in internal])
    print("Found imports across D:\SmartMove:")
    for m in third_party:
        print(m)
