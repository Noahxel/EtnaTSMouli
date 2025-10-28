npm run build && docker build -t mouli-ts-checker:latest . 2>&1 | grep "naming to"
npm run build
echo -e "${GREEN}✅ Build complete!${NC}"