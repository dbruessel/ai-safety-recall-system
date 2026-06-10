from google.cloud import firestore

db = firestore.Client()

def purge_corrupted_tasks():
    print("🧹 Starting targeted deletion of corrupted import entries...")
    
    total_deleted = 0
    
    while True:
        # Pull records stuck under failed_api in batches of 500
        docs = list(db.collection('recall_tasks')
                    .where('status', '==', 'failed_api')
                    .limit(500)
                    .stream())
        
        if not docs:
            break
            
        batch = db.batch()
        mutations_in_batch = 0
        
        for doc in docs:
            doc_id = str(doc.id)
            tdata = doc.to_dict()
            model_val = str(tdata.get('model', ''))
            
            # Identify if this document is part of the broken generation pool
            # (Checks for stringified dictionary structures in ID or junk values)
            if '{' in doc_id or 'CREEK_ENTERPRISES' in doc_id or 'CREEK_ENTERPRISES' in model_val:
                batch.delete(db.collection('recall_tasks').document(doc.id))
                mutations_in_batch += 1
                total_deleted += 1
                
        if mutations_in_batch > 0:
            print(f"🗑️ Purged batch of {mutations_in_batch} corrupt data records...")
            batch.commit()
        else:
            print("ℹ️ Remaining 'failed_api' rows look like valid vehicles. Stopping sweep.")
            break
            
    print(f"\n🎉 SUCCESS! Database cleanup finalized.")
    print(f"🗑️ Total corrupted initialization rows completely removed: {total_deleted}")

if __name__ == '__main__':
    purge_corrupted_tasks()