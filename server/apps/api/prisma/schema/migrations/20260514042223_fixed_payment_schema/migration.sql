-- AddForeignKey
ALTER TABLE "upward_transaction" ADD CONSTRAINT "upward_transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
